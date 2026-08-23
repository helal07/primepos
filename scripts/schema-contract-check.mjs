#!/usr/bin/env node
/**
 * Schema contract checker (Phase 1, step 1 of the stabilization plan).
 *
 * Cross-checks three sources of truth that keep drifting apart and cause
 * runtime "Unknown column 'x' in 'y'" / silent empty-list bugs:
 *
 *   1. backend/database/migrations/*      -> real MySQL columns per table
 *   2. backend/app/Support/RestRegistry   -> columns exposed as filter/sort/search
 *   3. backend/app/Models/*               -> $fillable / $casts / $table
 *   4. src/**                             -> resources + filter/sort/with used by the UI
 *
 * Usage:  node scripts/schema-contract-check.mjs [--json]
 * Exit 1 when any ERROR-level mismatch is found (safe for CI).
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MIGRATIONS = path.join(ROOT, "backend/database/migrations");
const MODELS = path.join(ROOT, "backend/app/Models");
const REGISTRY = path.join(ROOT, "backend/app/Support/RestRegistry.php");
const SRC = path.join(ROOT, "src");

const walk = (dir, exts) => {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, exts));
    else if (exts.some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out;
};

/* ------------------------------------------------------------------ 1. tables */

const COLUMN_METHODS = [
  "id","uuid","ulid","char","string","text","tinyText","mediumText","longText",
  "integer","tinyInteger","smallInteger","mediumInteger","bigInteger",
  "unsignedInteger","unsignedTinyInteger","unsignedSmallInteger","unsignedMediumInteger","unsignedBigInteger",
  "increments","bigIncrements","float","double","decimal","unsignedDecimal","boolean",
  "enum","set","json","jsonb","date","dateTime","dateTimeTz","time","timeTz",
  "timestamp","timestampTz","year","binary","uuidMorphs","ipAddress","macAddress",
  "foreignId","foreignUuid",
];

/** table -> Set<column> */
const tables = new Map();
const ensure = (t) => { if (!tables.has(t)) tables.set(t, new Set()); return tables.get(t); };

const migrationFiles = walk(MIGRATIONS, [".php"]).sort();

for (const file of migrationFiles) {
  const src = fs.readFileSync(file, "utf8");
  // Split into Schema::create / Schema::table blocks (brace-balanced enough for Laravel style)
  const blockRe = /Schema::(create|table|dropIfExists|drop|rename)\(\s*'([^']+)'(?:\s*,\s*'([^']+)')?/g;
  let m;
  while ((m = blockRe.exec(src))) {
    const [, kind, table, second] = m;
    if (kind === "dropIfExists" || kind === "drop") { tables.delete(table); continue; }
    if (kind === "rename") {
      if (second && tables.has(table)) { tables.set(second, tables.get(table)); tables.delete(table); }
      continue;
    }
    // find the closure body
    const start = src.indexOf("{", m.index);
    if (start < 0) continue;
    let depth = 0, end = start;
    for (let i = start; i < src.length; i++) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
    }
    const body = src.slice(start, end);
    const cols = ensure(table);

    if (kind === "create") cols.clear();

    for (const cm of body.matchAll(/\$table->([A-Za-z]+)\(\s*'([^']*)'/g)) {
      const [, method, name] = cm;
      if (COLUMN_METHODS.includes(method)) {
        cols.add(name);
        if (method === "foreignId" || method === "foreignUuid") cols.add(name);
      }
      if (method === "renameColumn") {
        const rn = body.slice(cm.index).match(/renameColumn\(\s*'([^']+)'\s*,\s*'([^']+)'/);
        if (rn) { cols.delete(rn[1]); cols.add(rn[2]); }
      }
      if (method === "dropColumn") {
        const dc = body.slice(cm.index).match(/dropColumn\(\s*(\[[^\]]*\]|'[^']+')/);
        if (dc) for (const c of dc[1].matchAll(/'([^']+)'/g)) cols.delete(c[1]);
      }
    }
    if (/\$table->timestamps\(\)/.test(body)) { cols.add("created_at"); cols.add("updated_at"); }
    if (/\$table->softDeletes\(\)/.test(body)) cols.add("deleted_at");
    if (/\$table->rememberToken\(\)/.test(body)) cols.add("remember_token");
    if (/\$table->id\(\)/.test(body)) cols.add("id");
    if (/\$table->uuid\(\)/.test(body)) cols.add("uuid");
  }
}

/* ------------------------------------------------------------------ 2. models */

/** modelClass -> { table, fillable[], casts[] } */
const models = new Map();
for (const file of walk(MODELS, [".php"])) {
  const src = fs.readFileSync(file, "utf8");
  const cls = path.basename(file, ".php");
  const tableM = src.match(/protected \$table\s*=\s*'([^']+)'/);
  const fillM = src.match(/\$fillable\s*=\s*\[([\s\S]*?)\]/);
  const castM = src.match(/\$casts\s*=\s*\[([\s\S]*?)\]/);
  const list = (s) => (s ? [...s.matchAll(/'([^']+)'/g)].map((x) => x[1]) : []);
  models.set(cls, {
    table: tableM ? tableM[1] : null,
    fillable: list(fillM?.[1]),
    casts: castM ? [...castM[1].matchAll(/'([^']+)'\s*=>/g)].map((x) => x[1]) : [],
  });
}

/* ---------------------------------------------------------------- 3. registry */

const registrySrc = fs.existsSync(REGISTRY) ? fs.readFileSync(REGISTRY, "utf8") : "";
/** resource -> { model, filters, sort, search, with, table } */
const resources = new Map();
{
  const re = /'([a-z0-9_]+)'\s*=>\s*\[/g;
  let m;
  while ((m = re.exec(registrySrc))) {
    const name = m[1];
    const start = registrySrc.indexOf("[", m.index + m[1].length);
    let depth = 0, end = start;
    for (let i = start; i < registrySrc.length; i++) {
      if (registrySrc[i] === "[") depth++;
      else if (registrySrc[i] === "]") { depth--; if (depth === 0) { end = i; break; } }
    }
    const body = registrySrc.slice(start, end + 1);
    if (!/'model'\s*=>/.test(body)) continue;
    const grab = (key) => {
      const k = body.match(new RegExp(`'${key}'\\s*=>\\s*\\[([^\\]]*)\\]`));
      return k ? [...k[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) : [];
    };
    const modelM = body.match(/'model'\s*=>\s*Models\\\\?([A-Za-z]+)::class/);
    const cls = modelM ? modelM[1] : null;
    const defSort = body.match(/'default_sort'\s*=>\s*'([^']+)'/)?.[1] ?? null;
    resources.set(name, {
      model: cls,
      filters: grab("filters"),
      sort: grab("sort"),
      search: grab("search"),
      with: grab("with"),
      defaultSort: defSort,
      table: (cls && models.get(cls)?.table) || name,
    });
  }
}

/* ---------------------------------------------------------------- 4. frontend */

/** resource -> { files:Set, filters:Set, sorts:Set, withs:Set } */
const feUsage = new Map();
const feEnsure = (r) => {
  if (!feUsage.has(r)) feUsage.set(r, { files: new Set(), filters: new Set(), sorts: new Set(), withs: new Set() });
  return feUsage.get(r);
};

for (const file of walk(SRC, [".ts", ".tsx"])) {
  const src = fs.readFileSync(file, "utf8");
  const rel = path.relative(ROOT, file);
  for (const m of src.matchAll(/rest\.(list|all|get|create|update|remove)(?:<[^>]*>)?\(\s*["'`]([a-z0-9_]+)["'`]([\s\S]{0,600})/g)) {
    const [, , resource, tail] = m;
    const u = feEnsure(resource);
    u.files.add(rel);
    // only look at the argument object that immediately follows
    const scope = tail.split(/\n\s*\}\s*\)\s*;/)[0];
    const filterBlock = scope.match(/filter\s*:\s*\{([\s\S]*?)\}/);
    if (filterBlock) for (const f of filterBlock[1].matchAll(/(?:^|[\s{,])["']?([a-z0-9_]+)["']?\s*:/g)) u.filters.add(f[1]);
    for (const s of scope.matchAll(/sort\s*:\s*["'`]([^"'`]+)["'`]/g)) s[1].split(",").forEach((x) => u.sorts.add(x.trim().replace(/^-/, "")));
    const withBlock = scope.match(/with\s*:\s*\[([^\]]*)\]/);
    if (withBlock) for (const w of withBlock[1].matchAll(/["']([a-z0-9_.]+)["']/g)) u.withs.add(w[1]);
  }
}

/* ------------------------------------------------------------------ 5. report */

const errors = [];
const warns = [];
const has = (table, col) => tables.has(table) && tables.get(table).has(col);
const VIRTUAL = new Set(["id", "created_at", "updated_at", "deleted_at"]);

for (const [name, r] of resources) {
  if (!tables.has(r.table)) {
    errors.push(`[table missing] resource "${name}" -> model ${r.model} -> table "${r.table}" has no migration`);
    continue;
  }
  const check = (kind, cols) => {
    for (const c of cols) {
      if (!has(r.table, c) && !VIRTUAL.has(c)) {
        errors.push(`[${kind}] ${name}: column "${c}" not in table ${r.table}`);
      }
    }
  };
  check("registry.filters", r.filters);
  check("registry.sort", r.sort);
  check("registry.search", r.search);
  if (r.defaultSort) check("registry.default_sort", [r.defaultSort.replace(/^-/, "")]);

  const mdl = r.model ? models.get(r.model) : null;
  if (!mdl) warns.push(`[model missing] resource "${name}" references Models\\${r.model}`);
  else for (const f of mdl.fillable) {
    if (!has(r.table, f)) errors.push(`[model.fillable] ${r.model}: "${f}" not in table ${r.table}`);
  }
}

for (const [name, u] of feUsage) {
  const r = resources.get(name);
  if (!r) {
    errors.push(`[not whitelisted] frontend calls rest "${name}" but RestRegistry has no such resource (${[...u.files].slice(0, 3).join(", ")})`);
    continue;
  }
  for (const f of u.filters) {
    if (!r.filters.includes(f) && !VIRTUAL.has(f)) {
      errors.push(`[filter not allowed] ${name}.${f} used in UI but missing from RestRegistry filters (${[...u.files].slice(0, 2).join(", ")})`);
    }
  }
  for (const s of u.sorts) {
    if (!r.sort.includes(s)) errors.push(`[sort not allowed] ${name}: sort "${s}" not in RestRegistry sort list`);
  }
  for (const w of u.withs) {
    if (!r.with.includes(w.split(".")[0])) errors.push(`[with not allowed] ${name}: relation "${w}" not in RestRegistry with list`);
  }
}

const unused = [...resources.keys()].filter((r) => !feUsage.has(r));

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ errors, warns, tables: tables.size, resources: resources.size, unused }, null, 2));
} else {
  console.log(`tables parsed: ${tables.size}   rest resources: ${resources.size}   resources used by UI: ${feUsage.size}`);
  console.log(`\nERRORS (${errors.length})`);
  errors.forEach((e) => console.log("  ✖ " + e));
  console.log(`\nWARNINGS (${warns.length})`);
  warns.forEach((e) => console.log("  ! " + e));
  console.log(`\nRegistry resources never used by the UI (${unused.length}): ${unused.join(", ")}`);
}

process.exit(errors.length ? 1 : 0);

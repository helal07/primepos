// Runs before `vite dev` and `vite build` (predev/prebuild hooks).
// Emits a sitemap index at public/sitemap.xml plus per-section sitemaps
// under public/sitemaps/. Each section sitemap is chunked at 45,000 URLs
// to stay safely under the 50,000-URL / 50 MB sitemaps.org limits.
//
// Override the host with the SITE_URL env var when deploying to a custom
// domain (e.g. SITE_URL=https://yourdomain.com bun run build).

import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const SITE_URL = (process.env.SITE_URL || "https://primepos.lovable.app").replace(/\/$/, "");
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY;

const MAX_PER_SITEMAP = 45_000;

type Freq = "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
interface Entry {
  path: string;
  changefreq?: Freq;
  priority?: string;
  lastmod?: string;
}

const marketingEntries: Entry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/#features", changefreq: "weekly", priority: "0.9" },
  { path: "/#modules", changefreq: "weekly", priority: "0.9" },
  { path: "/#pricing", changefreq: "weekly", priority: "0.9" },
  { path: "/#testimonials", changefreq: "monthly", priority: "0.7" },
  { path: "/#faq", changefreq: "monthly", priority: "0.7" },
  { path: "/#contact", changefreq: "monthly", priority: "0.7" },
  { path: "/register", changefreq: "monthly", priority: "0.9" },
  { path: "/login", changefreq: "yearly", priority: "0.4" },
];

async function fetchCmsEntries(): Promise<Entry[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/sitemap_entries?select=path,priority,changefreq,updated_at&is_active=eq.true&order=path.asc`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
    );
    if (!res.ok) return [];
    const rows = (await res.json()) as Array<{
      path: string;
      priority: number | null;
      changefreq: string | null;
      updated_at: string | null;
    }>;
    return rows.map((r) => ({
      path: r.path.startsWith("/") ? r.path : `/${r.path}`,
      priority: r.priority != null ? Number(r.priority).toFixed(1) : undefined,
      changefreq: (r.changefreq as Freq) || undefined,
      lastmod: r.updated_at ? new Date(r.updated_at).toISOString().slice(0, 10) : undefined,
    }));
  } catch {
    return [];
  }
}

async function fetchCmsPages(): Promise<Entry[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/cms_pages?select=slug,updated_at&status=eq.published&order=slug.asc`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
    );
    if (!res.ok) return [];
    const rows = (await res.json()) as Array<{ slug: string; updated_at: string | null }>;
    return rows
      .filter((r) => r.slug)
      .map((r) => ({
        path: `/p/${r.slug.replace(/^\/+/, "")}`,
        changefreq: "monthly" as Freq,
        priority: "0.6",
        lastmod: r.updated_at ? new Date(r.updated_at).toISOString().slice(0, 10) : undefined,
      }));
  } catch {
    return [];
  }
}

function dedupe(entries: Entry[]): Entry[] {
  const map = new Map<string, Entry>();
  for (const e of entries) map.set(e.path, { ...map.get(e.path), ...e });
  return Array.from(map.values());
}

function chunk<T>(arr: T[], size: number): T[][] {
  if (arr.length === 0) return [];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function buildUrlset(entries: Entry[]): string {
  const today = new Date().toISOString().slice(0, 10);
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${SITE_URL}${e.path}</loc>`,
      `    <lastmod>${e.lastmod || today}</lastmod>`,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ].filter(Boolean).join("\n"),
  );
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
    "",
  ].join("\n");
}

function buildIndex(files: { name: string; lastmod: string }[]): string {
  const items = files.map((f) =>
    [
      `  <sitemap>`,
      `    <loc>${SITE_URL}/sitemaps/${f.name}</loc>`,
      `    <lastmod>${f.lastmod}</lastmod>`,
      `  </sitemap>`,
    ].join("\n"),
  );
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...items,
    `</sitemapindex>`,
    "",
  ].join("\n");
}

function writeSection(name: string, entries: Entry[], today: string): { name: string; lastmod: string }[] {
  const chunks = chunk(dedupe(entries), MAX_PER_SITEMAP);
  if (chunks.length === 0) return [];
  return chunks.map((part, i) => {
    const filename = chunks.length === 1 ? `${name}.xml` : `${name}-${i + 1}.xml`;
    writeFileSync(resolve(`public/sitemaps/${filename}`), buildUrlset(part));
    return { name: filename, lastmod: today };
  });
}

(async () => {
  const today = new Date().toISOString().slice(0, 10);
  const dir = resolve("public/sitemaps");
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });

  const [cmsEntries, cmsPages] = await Promise.all([fetchCmsEntries(), fetchCmsPages()]);

  const files = [
    ...writeSection("marketing", marketingEntries, today),
    ...writeSection("cms-entries", cmsEntries, today),
    ...writeSection("cms-pages", cmsPages, today),
  ];

  writeFileSync(resolve("public/sitemap.xml"), buildIndex(files));
  console.log(
    `[sitemap] wrote sitemap index with ${files.length} child sitemap(s) (${marketingEntries.length} marketing, ${cmsEntries.length} cms entries, ${cmsPages.length} cms pages)`,
  );
})();

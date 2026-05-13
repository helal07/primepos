// Runs before `vite dev` and `vite build` (predev/prebuild hooks).
// Writes a rich, marketing-friendly sitemap.xml into /public so it ends
// up at the site root (e.g. Hostinger public_html/sitemap.xml).
//
// Override the host with the SITE_URL env var when deploying to a custom
// domain (e.g. SITE_URL=https://yourdomain.com bun run build).

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const SITE_URL = (process.env.SITE_URL || "https://primepos.lovable.app").replace(/\/$/, "");
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY;

type Freq = "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
interface Entry {
  path: string;
  changefreq?: Freq;
  priority?: string;
  lastmod?: string;
}

// Public marketing + SaaS information surfaces. Hash anchors point at
// existing landing-page sections so search engines surface them in
// sitelinks (Google honours #fragment when the section ids exist).
const staticEntries: Entry[] = [
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
    if (!res.ok) {
      console.warn(`[sitemap] CMS fetch failed: ${res.status} ${res.statusText}`);
      return [];
    }
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
  } catch (err) {
    console.warn(`[sitemap] CMS fetch error: ${(err as Error).message}`);
    return [];
  }
}

function dedupe(entries: Entry[]): Entry[] {
  const map = new Map<string, Entry>();
  for (const e of entries) map.set(e.path, { ...map.get(e.path), ...e });
  return Array.from(map.values());
}

function buildXml(entries: Entry[]): string {
  const today = new Date().toISOString().slice(0, 10);
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${SITE_URL}${e.path}</loc>`,
      `    <lastmod>${e.lastmod || today}</lastmod>`,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
    "",
  ].join("\n");
}

(async () => {
  const cms = await fetchCmsEntries();
  const entries = dedupe([...staticEntries, ...cms]);
  const xml = buildXml(entries);
  writeFileSync(resolve("public/sitemap.xml"), xml);
  console.log(`[sitemap] wrote public/sitemap.xml (${entries.length} URLs, host ${SITE_URL})`);
})();
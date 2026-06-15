import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DEFAULT_BASE_URL = Deno.env.get("SITEMAP_BASE_URL") ?? "https://primepos.lovable.app";

const MARKETING: Array<{ path: string; changefreq: string; priority: string }> = [
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

function xmlEscape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function urlTag(loc: string, lastmod?: string, changefreq?: string, priority?: string) {
  return [
    `  <url>`,
    `    <loc>${xmlEscape(loc)}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority ? `    <priority>${priority}</priority>` : null,
    `  </url>`,
  ].filter(Boolean).join("\n");
}

Deno.serve(async (req) => {
  const reqUrl = new URL(req.url);
  const today = new Date().toISOString().slice(0, 10);
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Resolve base URL: prefer ?base= param, then cms_seo canonical_base, then env, then request origin.
    let baseUrl = reqUrl.searchParams.get("base") || "";
    const { data: seoRow } = await supabase
      .from("business_settings").select("value").eq("key", "cms_seo").maybeSingle();
    const seo = (seoRow?.value as Record<string, unknown> | null) ?? null;
    if (!baseUrl && seo) {
      const candidate = (seo.canonical_url || seo.site_url || seo.base_url) as string | undefined;
      if (candidate) baseUrl = String(candidate).replace(/\/$/, "");
    }
    if (!baseUrl) baseUrl = DEFAULT_BASE_URL;
    baseUrl = baseUrl.replace(/\/$/, "");

    const [entriesRes, faqRes] = await Promise.all([
      supabase.from("sitemap_entries").select("path, priority, changefreq, updated_at").eq("is_active", true).order("path"),
      supabase.from("faq_entries").select("updated_at").eq("is_active", true).order("updated_at", { ascending: false }).limit(1),
    ]);

    const urls: string[] = [];

    // Marketing routes (with FAQ lastmod patched in if available)
    const faqLastmod = faqRes.data?.[0]?.updated_at ? new Date(faqRes.data[0].updated_at).toISOString().slice(0, 10) : today;
    for (const m of MARKETING) {
      const lastmod = m.path === "/#faq" ? faqLastmod : today;
      urls.push(urlTag(`${baseUrl}${m.path}`, lastmod, m.changefreq, m.priority));
    }

    // Custom sitemap_entries
    for (const e of entriesRes.data ?? []) {
      const path = e.path.startsWith("/") ? e.path : `/${e.path}`;
      const lastmod = e.updated_at ? new Date(e.updated_at).toISOString().slice(0, 10) : today;
      urls.push(urlTag(`${baseUrl}${path}`, lastmod, e.changefreq ?? undefined, e.priority != null ? Number(e.priority).toFixed(1) : undefined));
    }

    const xml = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
      ...urls,
      `</urlset>`,
      "",
    ].join("\n");

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=300",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    return new Response(`<!-- sitemap error: ${(e as Error).message} -->`, {
      status: 500,
      headers: { "Content-Type": "application/xml" },
    });
  }
});

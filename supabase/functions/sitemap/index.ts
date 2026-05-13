import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BASE_URL = Deno.env.get("SITEMAP_BASE_URL") ?? "https://primepos.lovable.app";

Deno.serve(async () => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase
      .from("sitemap_entries")
      .select("path, priority, changefreq, updated_at")
      .eq("is_active", true)
      .order("path");
    if (error) throw error;

    const urls = (data ?? []).map((e) => {
      const loc = `${BASE_URL}${e.path.startsWith("/") ? e.path : "/" + e.path}`;
      const parts = [
        `  <url>`,
        `    <loc>${loc}</loc>`,
        e.updated_at ? `    <lastmod>${new Date(e.updated_at).toISOString().slice(0, 10)}</lastmod>` : null,
        e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
        e.priority != null ? `    <priority>${Number(e.priority).toFixed(1)}</priority>` : null,
        `  </url>`,
      ].filter(Boolean).join("\n");
      return parts;
    });

    const xml = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
      ...urls,
      `</urlset>`,
    ].join("\n");

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (e) {
    return new Response(`<!-- sitemap error: ${(e as Error).message} -->`, {
      status: 500,
      headers: { "Content-Type": "application/xml" },
    });
  }
});

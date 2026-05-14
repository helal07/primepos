import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DEFAULT_BASE_URL = Deno.env.get("SITEMAP_BASE_URL") ?? "https://primepos.lovable.app";

const DEFAULT_DISALLOW = [
  "/superadmin/", "/admin/", "/dashboard", "/pos", "/settings", "/profile", "/subscription",
];

Deno.serve(async (req) => {
  const reqUrl = new URL(req.url);
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: seoRow } = await supabase
      .from("business_settings").select("value").eq("key", "cms_seo").maybeSingle();
    const seo = (seoRow?.value as Record<string, unknown> | null) ?? {};

    let baseUrl = (reqUrl.searchParams.get("base") as string) || (seo.canonical_url || seo.site_url || seo.base_url) as string || DEFAULT_BASE_URL;
    baseUrl = String(baseUrl).replace(/\/$/, "");

    const allowAll = seo.allow_indexing !== false; // default true
    const extraDisallow = Array.isArray(seo.robots_disallow) ? (seo.robots_disallow as string[]) : [];
    const customRules = typeof seo.robots_extra === "string" ? (seo.robots_extra as string) : "";

    const sitemapUrl = `${baseUrl}/sitemap.xml`;

    const lines: string[] = [];
    if (!allowAll) {
      lines.push("User-agent: *", "Disallow: /", "");
    } else {
      for (const ua of ["Googlebot", "Bingbot", "Twitterbot", "facebookexternalhit"]) {
        lines.push(`User-agent: ${ua}`, "Allow: /", "");
      }
      lines.push("User-agent: *", "Allow: /");
      for (const d of [...DEFAULT_DISALLOW, ...extraDisallow]) lines.push(`Disallow: ${d}`);
      lines.push("");
    }
    if (customRules.trim()) { lines.push(customRules.trim(), ""); }
    lines.push(`Sitemap: ${sitemapUrl}`);

    return new Response(lines.join("\n") + "\n", {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=300",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    return new Response(`# robots error: ${(e as Error).message}\nUser-agent: *\nAllow: /\nSitemap: ${DEFAULT_BASE_URL}/sitemap.xml\n`, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
});
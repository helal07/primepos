// First-party proxy for Meta Pixel script.
// Many ad blockers block connect.facebook.net but allow same-origin requests.
// The browser fetches /functions/v1/fb-pixel-proxy and gets fbevents.js streamed back.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const upstream = await fetch("https://connect.facebook.net/en_US/fbevents.js", {
      headers: { "User-Agent": req.headers.get("user-agent") ?? "Mozilla/5.0" },
    });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    return new Response(`/* fb pixel proxy error: ${(e as Error).message} */`, {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/javascript" },
    });
  }
});

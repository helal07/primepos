// Server-side tracking dispatcher.
// Receives events from the browser and forwards to:
//   - Meta Conversions API (CAPI)  — bypasses ad blockers
//   - GA4 Measurement Protocol     — bypasses ad blockers
// Public endpoint (no JWT). Reads credentials from business_settings.cms_tracking.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value.trim().toLowerCase());
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface IncomingEvent {
  event_name: string;                 // "PageView" | "Lead" | "Purchase" | custom
  event_id?: string;                  // for dedupe with browser pixel
  event_source_url?: string;
  user_data?: {
    email?: string;
    phone?: string;
    first_name?: string;
    last_name?: string;
    external_id?: string;
    fbp?: string;                     // _fbp cookie
    fbc?: string;                     // _fbc cookie
    client_user_agent?: string;
    client_ip?: string;
  };
  custom_data?: {
    value?: number;
    currency?: string;
    content_name?: string;
    content_ids?: string[];
    [k: string]: unknown;
  };
  // GA4 fields
  ga4_client_id?: string;
  ga4_session_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let payload: IncomingEvent;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (!payload?.event_name || typeof payload.event_name !== "string") {
    return json({ error: "event_name required" }, 400);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: row } = await admin
    .from("business_settings")
    .select("value")
    .eq("key", "cms_tracking")
    .is("tenant_id", null)
    .maybeSingle();

  const cfg = (row?.value ?? {}) as Record<string, string>;
  const fbPixelId = cfg.fb_pixel_id?.trim();
  const fbToken = cfg.fb_conversion_token?.trim();
  const fbTestCode = cfg.fb_test_event_code?.trim();
  const ga4Id = cfg.ga4_id?.trim();
  const ga4Secret = cfg.ga4_api_secret?.trim();

  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") || "";
  const userAgent = payload.user_data?.client_user_agent || req.headers.get("user-agent") || "";
  const eventTime = Math.floor(Date.now() / 1000);
  const results: Record<string, unknown> = {};

  // ───── Meta Conversions API ─────
  if (fbPixelId && fbToken) {
    const u = payload.user_data ?? {};
    const userData: Record<string, unknown> = {
      client_ip_address: u.client_ip || clientIp || undefined,
      client_user_agent: userAgent || undefined,
      fbp: u.fbp || undefined,
      fbc: u.fbc || undefined,
    };
    if (u.email) userData.em = [await sha256Hex(u.email)];
    if (u.phone) userData.ph = [await sha256Hex(u.phone.replace(/\D/g, ""))];
    if (u.first_name) userData.fn = [await sha256Hex(u.first_name)];
    if (u.last_name) userData.ln = [await sha256Hex(u.last_name)];
    if (u.external_id) userData.external_id = [await sha256Hex(u.external_id)];

    const body = {
      data: [{
        event_name: payload.event_name,
        event_time: eventTime,
        event_id: payload.event_id,
        event_source_url: payload.event_source_url,
        action_source: "website",
        user_data: userData,
        custom_data: payload.custom_data,
      }],
      ...(fbTestCode ? { test_event_code: fbTestCode } : {}),
    };

    try {
      const r = await fetch(
        `https://graph.facebook.com/v19.0/${fbPixelId}/events?access_token=${fbToken}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
      );
      results.meta = { status: r.status, body: await r.json() };
    } catch (e) {
      results.meta = { error: (e as Error).message };
    }
  } else {
    results.meta = "skipped (no pixel id or token)";
  }

  // ───── GA4 Measurement Protocol ─────
  if (ga4Id && ga4Secret && payload.ga4_client_id) {
    const ga4Body = {
      client_id: payload.ga4_client_id,
      events: [{
        name: payload.event_name === "PageView" ? "page_view" : payload.event_name.toLowerCase(),
        params: {
          ...(payload.custom_data ?? {}),
          ...(payload.ga4_session_id ? { session_id: payload.ga4_session_id, engagement_time_msec: 100 } : {}),
          page_location: payload.event_source_url,
        },
      }],
    };
    try {
      const r = await fetch(
        `https://www.google-analytics.com/mp/collect?measurement_id=${ga4Id}&api_secret=${ga4Secret}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ga4Body) },
      );
      results.ga4 = { status: r.status };
    } catch (e) {
      results.ga4 = { error: (e as Error).message };
    }
  } else {
    results.ga4 = "skipped (no measurement id, secret, or client id)";
  }

  return json({ ok: true, results });
});

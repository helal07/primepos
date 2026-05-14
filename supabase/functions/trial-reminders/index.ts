import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MARKERS = [7, 3, 1, 0];

function buildEmail(tenantName: string, daysLeft: number, upgradeUrl: string) {
  const isExpired = daysLeft <= 0;
  const subject = isExpired
    ? `Your free trial has ended — upgrade to keep access`
    : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left in your free trial`;

  const headline = isExpired
    ? "Your free trial has ended"
    : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left in your trial`;

  const body = isExpired
    ? `Hi ${tenantName},<br/><br/>Your free trial has ended. To avoid losing access to your data, please choose a plan now.`
    : `Hi ${tenantName},<br/><br/>Just a friendly reminder that your free trial ends in <b>${daysLeft} day${daysLeft === 1 ? "" : "s"}</b>. Upgrade now to keep your account and data without interruption.`;

  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f6f7fb;margin:0;padding:24px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e6e8ef;">
    <tr><td style="padding:24px 28px;background:#0369a1;color:#fff;">
      <h1 style="margin:0;font-size:20px;">${headline}</h1>
    </td></tr>
    <tr><td style="padding:24px 28px;color:#1f2937;font-size:14px;line-height:1.6;">
      <p style="margin:0 0 18px;">${body}</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="${upgradeUrl}" style="background:#0369a1;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;display:inline-block;">
          ${isExpired ? "Choose a plan" : "Upgrade now"}
        </a>
      </p>
      <p style="margin:18px 0 0;color:#6b7280;font-size:12px;">If the button doesn't work, copy &amp; paste this link:<br/><a href="${upgradeUrl}">${upgradeUrl}</a></p>
    </td></tr>
    <tr><td style="padding:16px 28px;background:#f9fafb;color:#9ca3af;font-size:12px;text-align:center;">
      This is an automated trial reminder. Please do not reply to this email.
    </td></tr>
  </table></body></html>`;

  return { subject, html };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // Load SMTP config
    const { data: smtpRow } = await supabase
      .from("business_settings").select("value").eq("key", "email_smtp").maybeSingle();
    const smtp = (smtpRow?.value ?? {}) as Record<string, any>;

    if (!smtp.enabled) {
      return new Response(JSON.stringify({ ok: false, reason: "email_smtp not enabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!smtp.host || !smtp.port || !smtp.username || !smtp.password || !smtp.from_email) {
      return new Response(JSON.stringify({ ok: false, reason: "smtp config incomplete" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Load app base URL
    const { data: brandRow } = await supabase
      .from("business_settings").select("value").eq("key", "branding").maybeSingle();
    const baseUrl =
      (brandRow?.value as any)?.site_url ||
      Deno.env.get("APP_PUBLIC_URL") ||
      "https://primepos.lovable.app";
    const upgradeUrl = `${baseUrl.replace(/\/$/, "")}/subscription`;

    // Fetch active trial tenants
    const { data: tenants, error } = await supabase
      .from("tenants")
      .select("id, name, email, status, subscription_end")
      .eq("status", "trial");
    if (error) throw error;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const client = new SMTPClient({
      connection: {
        hostname: String(smtp.host),
        port: Number(smtp.port),
        tls: String(smtp.secure ?? "").toLowerCase() === "true" || Number(smtp.port) === 465,
        auth: { username: String(smtp.username), password: String(smtp.password) },
      },
    });

    const results: any[] = [];

    for (const t of tenants ?? []) {
      if (!t.email || !t.subscription_end) continue;
      const end = new Date(`${t.subscription_end}T23:59:59`);
      const daysLeft = Math.ceil((end.getTime() - today.getTime()) / 86_400_000);
      const marker = MARKERS.find((m) => daysLeft === m);
      if (marker === undefined) continue;

      // Skip if already sent for this marker
      const { data: existing } = await supabase
        .from("trial_reminders_log")
        .select("id").eq("tenant_id", t.id).eq("days_marker", marker).maybeSingle();
      if (existing) continue;

      const { subject, html } = buildEmail(t.name ?? "there", daysLeft, upgradeUrl);
      try {
        await client.send({
          from: `${smtp.from_name ?? "PrimePOS"} <${smtp.from_email}>`,
          to: t.email,
          subject,
          html,
          content: subject,
        });
        await supabase.from("trial_reminders_log").insert({
          tenant_id: t.id, days_marker: marker, email: t.email, status: "sent",
        });
        results.push({ tenant: t.id, marker, status: "sent" });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await supabase.from("trial_reminders_log").insert({
          tenant_id: t.id, days_marker: marker, email: t.email, status: "failed", error: msg,
        });
        results.push({ tenant: t.id, marker, status: "failed", error: msg });
      }
    }

    await client.close();

    return new Response(JSON.stringify({ ok: true, processed: results.length, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
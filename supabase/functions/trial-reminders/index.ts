import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MARKERS = [7, 3, 1, 0];

type Tmpl = { subject: string; headline: string; body: string };
const DEFAULT_TEMPLATES: Record<string, Tmpl> = {
  "7": {
    subject: "{{days_left}} days left on your {{plan_name}} trial",
    headline: "{{days_left}} days left on your {{plan_name}} trial",
    body: "Hi {{tenant_name}},<br/><br/>Your <b>{{plan_name}}</b> trial ends in <b>{{days_left}} days</b> on <b>{{expiry_date}}</b>. Upgrade now to keep your account and data without interruption.",
  },
  "3": {
    subject: "Only {{days_left}} days left on your {{plan_name}} trial",
    headline: "{{days_left}} days left on your {{plan_name}} trial",
    body: "Hi {{tenant_name}},<br/><br/>Just a heads up — your <b>{{plan_name}}</b> trial ends in <b>{{days_left}} days</b> on <b>{{expiry_date}}</b>. Choose a plan to avoid losing access.",
  },
  "1": {
    subject: "Your {{plan_name}} trial ends tomorrow ({{expiry_date}})",
    headline: "1 day left on your {{plan_name}} trial",
    body: "Hi {{tenant_name}},<br/><br/>This is a final reminder — your <b>{{plan_name}}</b> trial ends tomorrow on <b>{{expiry_date}}</b>. Upgrade now to keep working without interruption.",
  },
  "0": {
    subject: "Your {{plan_name}} trial has ended — upgrade to keep access",
    headline: "Your {{plan_name}} trial has ended",
    body: "Hi {{tenant_name}},<br/><br/>Your <b>{{plan_name}}</b> trial ended on <b>{{expiry_date}}</b>. To avoid losing access to your data, please choose a plan now.",
  },
};

function renderVars(s: string, vars: Record<string, string>) {
  return s.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}

function escapeHtml(s: string) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function formatExpiry(d: Date) {
  // e.g. "May 21, 2026 at 11:59 PM"
  const date = d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${date} at ${time}`;
}

interface EmailVars {
  tenantName: string;
  planName: string;
  daysLeft: number;
  expiryAt: Date;
  upgradeUrl: string;
  template: Tmpl;
}

function buildEmail(v: EmailVars) {
  const { tenantName, planName, daysLeft, expiryAt, upgradeUrl, template } = v;
  const isExpired = daysLeft <= 0;
  const tName = escapeHtml(tenantName);
  const pName = escapeHtml(planName);
  const expiryLabel = escapeHtml(formatExpiry(expiryAt));
  const htmlVars: Record<string, string> = {
    tenant_name: tName, plan_name: pName, days_left: String(daysLeft),
    expiry_date: expiryLabel, upgrade_url: upgradeUrl,
  };
  const plainVars: Record<string, string> = {
    tenant_name: tenantName, plan_name: planName, days_left: String(daysLeft),
    expiry_date: formatExpiry(expiryAt), upgrade_url: upgradeUrl,
  };
  const subject = renderVars(template.subject, plainVars);
  const headline = renderVars(template.headline, htmlVars);
  const body = renderVars(template.body.replace(/\n/g, "<br/>"), htmlVars);

  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f6f7fb;margin:0;padding:24px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e6e8ef;">
    <tr><td style="padding:24px 28px;background:#0369a1;color:#fff;">
      <h1 style="margin:0;font-size:20px;">${headline}</h1>
    </td></tr>
    <tr><td style="padding:24px 28px;color:#1f2937;font-size:14px;line-height:1.6;">
      <p style="margin:0 0 18px;">${body}</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;background:#f3f4f6;border-radius:8px;margin:0 0 18px;">
        <tr><td style="padding:12px 16px;color:#374151;font-size:13px;">
          <div><b>Account:</b> ${tName}</div>
          <div><b>Plan:</b> ${pName}</div>
          <div><b>${isExpired ? "Ended" : "Expires"}:</b> ${expiryLabel}</div>
        </td></tr>
      </table>
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

    // Load admin-customized templates (merge over defaults per marker)
    const { data: tmplRow } = await supabase
      .from("business_settings").select("value").eq("key", "trial_email_templates").maybeSingle();
    const saved = (tmplRow?.value ?? {}) as Record<string, Partial<Tmpl>>;
    const templates: Record<string, Tmpl> = {};
    for (const k of Object.keys(DEFAULT_TEMPLATES)) {
      templates[k] = { ...DEFAULT_TEMPLATES[k], ...(saved[k] ?? {}) };
    }

    // Fetch active trial tenants
    const { data: tenants, error } = await supabase
      .from("tenants")
      .select("id, name, email, status, subscription_end, package_id, saas_packages(name)")
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

      const planName =
        ((t as any).saas_packages?.name as string | undefined) ?? "Free Trial";
      const { subject, html } = buildEmail({
        tenantName: t.name ?? "there",
        planName,
        daysLeft,
        expiryAt: end,
        upgradeUrl,
        template: templates[String(marker)],
      });
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
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(d: unknown, s = 200) {
  return new Response(JSON.stringify(d), {
    status: s, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (!token) return json({ error: "Missing auth" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData } = await userClient.auth.getUser(token);
    if (!userData?.user) return json({ error: "Invalid session" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: superRow } = await admin.rpc("is_superadmin", { _user_id: userData.user.id });
    if (!superRow) return json({ error: "Super admin only" }, 403);

    const body = await req.json();
    const paymentId = String(body.payment_id ?? "");
    const action = String(body.action ?? "");
    if (!paymentId || !action) return json({ error: "payment_id + action required" }, 400);

    const { data: pay } = await admin.from("tenant_payments")
      .select("id, tenant_id, package_id, amount, status").eq("id", paymentId).maybeSingle();
    if (!pay) return json({ error: "Payment not found" }, 404);

    if (action === "reject") {
      await admin.from("tenant_payments").update({
        status: "rejected", approved_at: new Date().toISOString(), approved_by: userData.user.id,
      }).eq("id", paymentId);
      return json({ ok: true });
    }
    if (action !== "approve") return json({ error: "Unknown action" }, 400);

    let durationDays = 30;
    if (pay.package_id) {
      const { data: pkg } = await admin.from("saas_packages")
        .select("duration_days").eq("id", pay.package_id).maybeSingle();
      if (pkg?.duration_days) durationDays = pkg.duration_days;
    }

    const { data: tenant } = await admin.from("tenants")
      .select("subscription_end,status").eq("id", pay.tenant_id).maybeSingle();
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    // Only stack onto existing subscription_end when the tenant is currently
    // active (true renewal). For trial/pending/suspended, start fresh from today
    // so a pre-set placeholder end-date does not double the granted duration.
    const baseStr = tenant?.subscription_end ?? null;
    const isRenewal = tenant?.status === "active";
    const base = isRenewal && baseStr && new Date(baseStr) > today
      ? new Date(baseStr)
      : today;
    const newEnd = new Date(base.getTime() + durationDays * 86_400_000);
    const newEndStr = newEnd.toISOString().slice(0, 10);

    await admin.from("tenant_payments").update({
      status: "active",
      starts_on: base.toISOString().slice(0, 10),
      ends_on: newEndStr,
      approved_at: new Date().toISOString(),
      approved_by: userData.user.id,
    }).eq("id", paymentId);

    await admin.from("tenants").update({
      status: "active",
      subscription_end: newEndStr,
      package_id: pay.package_id,
    }).eq("id", pay.tenant_id);

    return json({ ok: true, new_end: newEndStr });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
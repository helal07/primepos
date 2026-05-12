import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = { "Access-Control-Allow-Origin": "*" };

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const orderId = url.searchParams.get("order");
  const paymentID = url.searchParams.get("paymentID");
  const status = url.searchParams.get("status");
  const siteParam = url.searchParams.get("site") ?? "";
  const slug = url.searchParams.get("slug") ?? "";

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE);

  const site = (siteParam || "").replace(/\/$/, "");
  const target = (payment: string) =>
    `${site}/store/${slug}/order/${orderId}?payment=${payment}`;
  const redirect = (path: string) =>
    new Response(null, { status: 302, headers: { ...corsHeaders, Location: path } });

  if (!orderId) return redirect(`${site}/`);
  const { data: order } = await admin.from("store_orders").select("*").eq("id", orderId).maybeSingle();
  if (!order) return redirect(`${site}/`);

  if (status && status !== "success") {
    await admin.from("store_orders").update({ payment_status: "failed" }).eq("id", orderId);
    return redirect(target("cancelled"));
  }

  const { data: gw } = await admin.from("payment_gateways").select("id, mode, config").eq("provider", "bkash").maybeSingle();
  const { data: credRow } = gw
    ? await admin.from("payment_gateway_credentials").select("config").eq("gateway_id", gw.id).maybeSingle()
    : { data: null as any };
  const cfg = ((credRow?.config ?? gw?.config ?? {}) as Record<string, string>);
  const APP_KEY = cfg.app_key, APP_SECRET = cfg.app_secret;
  const USERNAME = cfg.username, PASSWORD = cfg.password;
  const sandbox = String(gw?.mode ?? "sandbox").toLowerCase() !== "live";
  const BASE = sandbox
    ? "https://tokenized.sandbox.bka.sh/v1.2.0-beta"
    : "https://tokenized.pay.bka.sh/v1.2.0-beta";
  if (!APP_KEY || !APP_SECRET || !USERNAME || !PASSWORD) return redirect(target("unconfigured"));

  try {
    const tokRes = await fetch(`${BASE}/tokenized/checkout/token/grant`, {
      method: "POST",
      headers: { "Content-Type": "application/json", username: USERNAME, password: PASSWORD },
      body: JSON.stringify({ app_key: APP_KEY, app_secret: APP_SECRET }),
    });
    const tok = await tokRes.json();
    const execRes = await fetch(`${BASE}/tokenized/checkout/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: tok.id_token, "X-APP-Key": APP_KEY },
      body: JSON.stringify({ paymentID: paymentID ?? order.payment_ref }),
    });
    const execData = await execRes.json();
    if (execData.transactionStatus === "Completed" || execData.statusCode === "0000") {
      const trxRef = execData.trxID ?? execData.paymentID;
      await admin.from("store_orders").update({
        payment_status: "paid", payment_ref: trxRef,
      }).eq("id", orderId);
      return redirect(target("success"));
    }
    await admin.from("store_orders").update({ payment_status: "failed" }).eq("id", orderId);
    return redirect(target("failed"));
  } catch (e) {
    await admin.from("store_orders").update({ payment_status: "failed" }).eq("id", orderId);
    return redirect(target("error"));
  }
});

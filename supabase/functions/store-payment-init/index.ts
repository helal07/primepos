// Initiates an online payment session for a storefront order (bKash or SSLCommerz).
// Public endpoint — caller passes order_id; the function looks up the order
// (which contains its tenant_id) and uses the shared payment_gateways credentials.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(d: unknown, s = 200) {
  return new Response(JSON.stringify(d), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE);

    const body = await req.json();
    const orderId = String(body.order_id ?? "");
    const gateway = String(body.gateway ?? "").toLowerCase();
    if (!orderId) return json({ error: "order_id required" }, 400);
    if (!["bkash", "sslcommerz"].includes(gateway)) return json({ error: "Unsupported gateway" }, 400);

    const { data: order } = await admin
      .from("store_orders")
      .select("id, tenant_id, order_number, total_amount, customer_name, customer_email, customer_phone, shipping_address, city, payment_status, status")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return json({ error: "Order not found" }, 404);
    if (order.status === "cancelled") return json({ error: "Order cancelled" }, 400);
    if (order.payment_status === "paid") return json({ error: "Already paid" }, 400);

    const { data: settings } = await admin
      .from("store_settings").select("enable_bkash, enable_sslcommerz").eq("tenant_id", order.tenant_id).maybeSingle();
    if (gateway === "bkash" && !settings?.enable_bkash) return json({ error: "bKash not enabled for this store" }, 400);
    if (gateway === "sslcommerz" && !settings?.enable_sslcommerz) return json({ error: "SSLCommerz not enabled for this store" }, 400);

    const { data: gw } = await admin
      .from("payment_gateways").select("id, mode, config").eq("provider", gateway).eq("active", true).maybeSingle();
    if (!gw) return json({ error: `${gateway} gateway not configured` }, 503);
    const { data: credRow } = await admin
      .from("payment_gateway_credentials").select("config").eq("gateway_id", gw.id).maybeSingle();
    const cfg = ((credRow?.config ?? gw.config ?? {}) as Record<string, string>);
    const sandbox = String(gw.mode ?? "sandbox").toLowerCase() !== "live";

    let siteUrl = "";
    const referer = req.headers.get("referer") ?? req.headers.get("origin") ?? "";
    if (referer) { try { siteUrl = new URL(referer).origin; } catch { /* */ } }
    if (!siteUrl) siteUrl = new URL(req.url).origin;

    // Get tenant slug for redirect
    const { data: tenant } = await admin.from("tenants").select("slug").eq("id", order.tenant_id).maybeSingle();
    const tenantSlug = tenant?.slug ?? "";
    const callbackBase = `${SUPABASE_URL}/functions/v1`;
    const cbq = `order=${order.id}&site=${encodeURIComponent(siteUrl)}&slug=${encodeURIComponent(tenantSlug)}`;

    if (gateway === "bkash") {
      const APP_KEY = cfg.app_key, APP_SECRET = cfg.app_secret;
      const USERNAME = cfg.username, PASSWORD = cfg.password;
      if (!APP_KEY || !APP_SECRET || !USERNAME || !PASSWORD) {
        return json({ error: "bKash credentials missing" }, 503);
      }
      const BASE = sandbox
        ? "https://tokenized.sandbox.bka.sh/v1.2.0-beta"
        : "https://tokenized.pay.bka.sh/v1.2.0-beta";
      const callbackUrl = `${callbackBase}/store-bkash-callback?${cbq}`;
      const tokRes = await fetch(`${BASE}/tokenized/checkout/token/grant`, {
        method: "POST",
        headers: { "Content-Type": "application/json", username: USERNAME, password: PASSWORD },
        body: JSON.stringify({ app_key: APP_KEY, app_secret: APP_SECRET }),
      });
      const tok = await tokRes.json();
      if (!tok.id_token) return json({ error: "bKash token failed", details: tok }, 502);
      const createRes = await fetch(`${BASE}/tokenized/checkout/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: tok.id_token, "X-APP-Key": APP_KEY },
        body: JSON.stringify({
          mode: "0011",
          payerReference: order.customer_phone,
          callbackURL: callbackUrl,
          amount: String(order.total_amount),
          currency: "BDT",
          intent: "sale",
          merchantInvoiceNumber: order.order_number,
        }),
      });
      const created = await createRes.json();
      if (!created.bkashURL) return json({ error: "bKash create failed", details: created }, 502);
      await admin.from("store_orders").update({
        payment_ref: created.paymentID,
      }).eq("id", order.id);
      return json({ url: created.bkashURL });
    }

    if (gateway === "sslcommerz") {
      const STORE_ID = cfg.store_id, STORE_PASSWD = cfg.store_password ?? cfg.store_passwd;
      if (!STORE_ID || !STORE_PASSWD) return json({ error: "SSLCommerz credentials missing" }, 503);
      const INIT_URL = sandbox
        ? "https://sandbox.sslcommerz.com/gwprocess/v4/api.php"
        : "https://securepay.sslcommerz.com/gwprocess/v4/api.php";
      const successUrl = `${callbackBase}/store-sslcommerz-callback?${cbq}&result=success`;
      const failUrl = `${callbackBase}/store-sslcommerz-callback?${cbq}&result=fail`;
      const cancelUrl = `${callbackBase}/store-sslcommerz-callback?${cbq}&result=cancel`;
      const ipnUrl = `${callbackBase}/store-sslcommerz-callback?${cbq}&result=ipn`;
      const params = new URLSearchParams({
        store_id: STORE_ID, store_passwd: STORE_PASSWD,
        total_amount: String(order.total_amount), currency: "BDT",
        tran_id: order.order_number,
        success_url: successUrl, fail_url: failUrl, cancel_url: cancelUrl, ipn_url: ipnUrl,
        product_name: `Order ${order.order_number}`, product_category: "general", product_profile: "general",
        cus_name: order.customer_name, cus_email: order.customer_email ?? "noemail@example.com",
        cus_phone: order.customer_phone, cus_add1: order.shipping_address ?? "N/A",
        cus_city: order.city ?? "Dhaka", cus_country: "Bangladesh",
        shipping_method: "NO", num_of_item: "1",
      });
      const res = await fetch(INIT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });
      const data = await res.json();
      if (data.status !== "SUCCESS" || !data.GatewayPageURL) {
        return json({ error: "SSLCommerz init failed", details: data }, 502);
      }
      await admin.from("store_orders").update({ payment_ref: data.sessionkey }).eq("id", order.id);
      return json({ url: data.GatewayPageURL });
    }

    return json({ error: "Unsupported gateway" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

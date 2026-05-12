// Initiates a bKash or EPS payment session for the calling tenant's admin.
// Reads gateway credentials from public.payment_gateway_credentials (managed in Super Admin).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { createHmac } from "node:crypto";
import { Buffer } from "node:buffer";

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

function epsHash(value: string, hashKey: string) {
  return createHmac("sha512", Buffer.from(hashKey, "utf8")).update(value, "utf8").digest("base64");
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
    const { data: profile } = await admin
      .from("profiles").select("tenant_id").eq("user_id", userData.user.id).maybeSingle();
    if (!profile?.tenant_id) return json({ error: "No tenant" }, 400);

    const body = await req.json();
    const gateway = String(body.gateway ?? "bkash").toLowerCase();
    const packageId = body.package_id ? String(body.package_id) : null;
    const sourceFlow = String(body.from ?? "") === "register" ? "register" : "subscription";

    let amount = Number(body.amount ?? 0);
    let currency = "BDT";
    if (packageId) {
      const { data: pkg } = await admin
        .from("saas_packages").select("price").eq("id", packageId).maybeSingle();
      if (pkg) amount = Number(pkg.price);
    }
    if (!amount || amount <= 0) return json({ error: "Invalid amount" }, 400);

    const { data: gw } = await admin
      .from("payment_gateways")
      .select("id, provider, active, mode, config")
      .eq("provider", gateway)
      .eq("active", true)
      .maybeSingle();
    if (!gw) {
      return json({
        error: `${gateway} is not configured`,
        hint: `Activate "${gateway}" in Super Admin → Payment Gateways and fill credentials.`,
      }, 503);
    }
    const { data: credRow } = await admin
      .from("payment_gateway_credentials").select("config").eq("gateway_id", gw.id).maybeSingle();
    const cfg = ((credRow?.config ?? gw.config ?? {}) as Record<string, string>);
    const sandbox = String(gw.mode ?? "sandbox").toLowerCase() !== "live";

    let siteUrl = "";
    const referer = req.headers.get("referer") ?? req.headers.get("origin") ?? "";
    if (referer) { try { siteUrl = new URL(referer).origin; } catch { /* */ } }
    if (!siteUrl) siteUrl = new URL(req.url).origin;

    const { data: attempt, error: attErr } = await admin
      .from("payment_attempts")
      .insert({
        tenant_id: profile.tenant_id, package_id: packageId, gateway,
        amount, currency, status: "initiated",
        raw_payload: { source: "payment-init" },
      })
      .select("id").single();
    if (attErr || !attempt) return json({ error: attErr?.message ?? "Could not log attempt" }, 500);

    const attemptId = attempt.id as string;
    const callbackBase = `${SUPABASE_URL}/functions/v1`;
    const callbackParams = `attempt=${attemptId}&from=${sourceFlow}&site=${encodeURIComponent(siteUrl)}`;

    if (gateway === "bkash") {
      const APP_KEY = cfg.app_key, APP_SECRET = cfg.app_secret;
      const USERNAME = cfg.username, PASSWORD = cfg.password;
      const BASE = sandbox
        ? "https://tokenized.sandbox.bka.sh/v1.2.0-beta"
        : "https://tokenized.pay.bka.sh/v1.2.0-beta";
      if (!APP_KEY || !APP_SECRET || !USERNAME || !PASSWORD) {
        return json({ error: "bKash credentials missing", attempt_id: attemptId }, 503);
      }
      const callbackUrl = `${callbackBase}/bkash-callback?${callbackParams}`;
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
          payerReference: profile.tenant_id,
          callbackURL: callbackUrl,
          amount: String(amount),
          currency: "BDT",
          intent: "sale",
          merchantInvoiceNumber: attemptId,
        }),
      });
      const created = await createRes.json();
      if (!created.bkashURL) return json({ error: "bKash create failed", details: created }, 502);
      await admin.from("payment_attempts").update({
        gateway_ref: created.paymentID, raw_payload: created,
      }).eq("id", attemptId);
      return json({ url: created.bkashURL, attempt_id: attemptId });
    }

    if (gateway === "eps") {
      const MERCHANT_ID = cfg.merchant_id, STORE_ID = cfg.store_id;
      const USERNAME = cfg.username, PASSWORD = cfg.password, HASH_KEY = cfg.hash_key;
      const TOKEN_URL = sandbox
        ? "https://sandbox-pgapi.eps.com.bd/v1/Auth/GetToken"
        : "https://pgapi.eps.com.bd/v1/Auth/GetToken";
      const INIT_URL = sandbox
        ? "https://sandbox-pgapi.eps.com.bd/v1/EPSEngine/InitializeEPS"
        : "https://pgapi.eps.com.bd/v1/EPSEngine/InitializeEPS";
      if (!MERCHANT_ID || !STORE_ID || !USERNAME || !PASSWORD || !HASH_KEY) {
        return json({ error: "EPS credentials missing", attempt_id: attemptId }, 503);
      }
      const tokenHash = epsHash(USERNAME!, HASH_KEY!);
      const tokRes = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-hash": tokenHash },
        body: JSON.stringify({ userName: USERNAME, password: PASSWORD }),
      });
      const tok = await tokRes.json().catch(() => ({}));
      const accessToken: string | undefined = tok.token ?? tok.Token ?? tok.accessToken;
      if (!accessToken) {
        await admin.from("payment_attempts").update({ status: "failed", raw_payload: tok }).eq("id", attemptId);
        return json({ error: "EPS token failed", details: tok }, 502);
      }
      const merchantTxnId = `T${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;
      const initHash = epsHash(merchantTxnId, HASH_KEY!);
      const successUrl = `${callbackBase}/eps-callback?${callbackParams}&txn=${merchantTxnId}&result=success`;
      const failUrl = `${callbackBase}/eps-callback?${callbackParams}&txn=${merchantTxnId}&result=fail`;
      const cancelUrl = `${callbackBase}/eps-callback?${callbackParams}&txn=${merchantTxnId}&result=cancel`;

      const initRes = await fetch(INIT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-hash": initHash, Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          merchantId: MERCHANT_ID, storeId: STORE_ID,
          CustomerOrderId: attemptId, merchantTransactionId: merchantTxnId,
          transactionTypeId: 1, financialEntityId: 0, transitionStatusId: 0,
          totalAmount: amount, ipAddress: "0.0.0.0", version: "1",
          successUrl, failUrl, cancelUrl,
          customerName: "Tenant Admin",
          customerEmail: userData.user.email ?? "tenant@example.com",
          CustomerAddress: "N/A", CustomerCity: "Dhaka", CustomerState: "Dhaka",
          CustomerPostcode: "1212", CustomerCountry: "BD", CustomerPhone: "01700000000",
          ShippingMethod: "NO", NoOfItem: "1", ProductName: "Subscription",
          ProductProfile: "general", ProductCategory: "general", ProductList: [],
        }),
      });
      const initData = await initRes.json().catch(() => ({}));
      const redirectUrl: string | undefined = initData.RedirectURL ?? initData.redirectUrl;
      if (!redirectUrl) {
        await admin.from("payment_attempts").update({ status: "failed", raw_payload: initData }).eq("id", attemptId);
        return json({ error: "EPS init failed", details: initData }, 502);
      }
      await admin.from("payment_attempts").update({
        gateway_ref: merchantTxnId, raw_payload: { init: initData, merchantTxnId },
      }).eq("id", attemptId);
      return json({ url: redirectUrl, attempt_id: attemptId });
    }

    return json({ error: `Unknown gateway: ${gateway}` }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
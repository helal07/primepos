import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = { "Access-Control-Allow-Origin": "*" };

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const orderId = url.searchParams.get("order");
  const result = url.searchParams.get("result") ?? "fail";
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

  // SSLCommerz POSTs form-urlencoded data
  let body: Record<string, string> = {};
  if (req.method === "POST") {
    const text = await req.text();
    try {
      const params = new URLSearchParams(text);
      params.forEach((v, k) => { body[k] = v; });
    } catch { /* ignore */ }
  }

  if (result === "cancel" || result === "fail") {
    await admin.from("store_orders").update({ payment_status: "failed" }).eq("id", orderId);
    return redirect(target(result === "cancel" ? "cancelled" : "failed"));
  }

  // Validate against SSLCommerz validator
  const valId = body.val_id;
  const { data: gw } = await admin.from("payment_gateways").select("id, mode, config").eq("provider", "sslcommerz").maybeSingle();
  const { data: credRow } = gw
    ? await admin.from("payment_gateway_credentials").select("config").eq("gateway_id", gw.id).maybeSingle()
    : { data: null as any };
  const cfg = ((credRow?.config ?? gw?.config ?? {}) as Record<string, string>);
  const STORE_ID = cfg.store_id, STORE_PASSWD = cfg.store_password ?? cfg.store_passwd;
  const sandbox = String(gw?.mode ?? "sandbox").toLowerCase() !== "live";
  const VALIDATE_URL = sandbox
    ? "https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php"
    : "https://securepay.sslcommerz.com/validator/api/validationserverAPI.php";

  let valid = false;
  let trxRef: string | undefined;
  if (valId && STORE_ID && STORE_PASSWD) {
    try {
      const params = new URLSearchParams({ val_id: valId, store_id: STORE_ID, store_passwd: STORE_PASSWD, format: "json" });
      const res = await fetch(`${VALIDATE_URL}?${params.toString()}`);
      const data = await res.json();
      if (data.status === "VALID" || data.status === "VALIDATED") {
        valid = true;
        trxRef = data.bank_tran_id ?? data.tran_id;
      }
    } catch { /* ignore */ }
  }

  if (valid) {
    await admin.from("store_orders").update({
      payment_status: "paid", payment_ref: trxRef ?? body.tran_id,
    }).eq("id", orderId);
    if (result === "ipn") return new Response("OK", { headers: corsHeaders });
    return redirect(target("success"));
  }

  await admin.from("store_orders").update({ payment_status: "failed" }).eq("id", orderId);
  if (result === "ipn") return new Response("FAIL", { headers: corsHeaders });
  return redirect(target("failed"));
});

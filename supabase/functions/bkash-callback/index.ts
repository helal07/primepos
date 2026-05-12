import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = { "Access-Control-Allow-Origin": "*" };

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const attemptId = url.searchParams.get("attempt");
  const paymentID = url.searchParams.get("paymentID");
  const status = url.searchParams.get("status");
  const siteParam = url.searchParams.get("site") ?? "";
  const fromRegister = url.searchParams.get("from") === "register";

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE);

  const site = (siteParam || "").replace(/\/$/, "");
  const redirect = (path: string) =>
    new Response(null, { status: 302, headers: { ...corsHeaders, Location: `${site}${path}` } });
  const resultPath = (payment: string) =>
    `/subscription?payment=${payment}${fromRegister ? "&from=register" : ""}`;

  if (!attemptId) return redirect(resultPath("missing"));
  const { data: attempt } = await admin.from("payment_attempts").select("*").eq("id", attemptId).maybeSingle();
  if (!attempt) return redirect(resultPath("notfound"));

  if (status && status !== "success") {
    await admin.from("payment_attempts").update({ status: "failed", raw_payload: { status, paymentID } }).eq("id", attemptId);
    return redirect(resultPath("cancelled"));
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
  if (!APP_KEY || !APP_SECRET || !USERNAME || !PASSWORD) return redirect(resultPath("unconfigured"));

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
      body: JSON.stringify({ paymentID: paymentID ?? attempt.gateway_ref }),
    });
    const execData = await execRes.json();
    if (execData.transactionStatus === "Completed" || execData.statusCode === "0000") {
      const trxRef = execData.trxID ?? execData.paymentID;
      await admin.from("payment_attempts").update({ status: "success", gateway_ref: trxRef, raw_payload: execData }).eq("id", attemptId);
      await admin.rpc("activate_tenant_after_payment", {
        _tenant_id: attempt.tenant_id,
        _amount: Number(execData.amount ?? attempt.amount),
        _gateway: "bkash",
        _gateway_ref: trxRef,
      });
      return redirect(resultPath("success"));
    }
    await admin.from("payment_attempts").update({ status: "failed", raw_payload: execData }).eq("id", attemptId);
    return redirect(resultPath("failed"));
  } catch (e) {
    await admin.from("payment_attempts").update({ status: "failed", raw_payload: { error: (e as Error).message } }).eq("id", attemptId);
    return redirect(resultPath("error"));
  }
});
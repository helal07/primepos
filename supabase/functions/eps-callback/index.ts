import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { createHmac } from "node:crypto";
import { Buffer } from "node:buffer";

const corsHeaders = { "Access-Control-Allow-Origin": "*" };

function epsHash(value: string, hashKey: string) {
  return createHmac("sha512", Buffer.from(hashKey, "utf8")).update(value, "utf8").digest("base64");
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const attemptId = url.searchParams.get("attempt");
  const merchantTxnId = url.searchParams.get("txn");
  const result = (url.searchParams.get("result") ?? "").toLowerCase();
  const siteParam = url.searchParams.get("site") ?? "";
  const fromRegister = url.searchParams.get("from") === "register";

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE);

  const site = (siteParam || "").replace(/\/$/, "");
  const redirect = (p: string) =>
    new Response(null, { status: 302, headers: { ...corsHeaders, Location: `${site}${p}` } });
  const resultPath = (payment: string) =>
    `/subscription?payment=${payment}${fromRegister ? "&from=register" : ""}`;

  if (!attemptId) return redirect(resultPath("missing"));
  const { data: attempt } = await admin.from("payment_attempts").select("*").eq("id", attemptId).maybeSingle();
  if (!attempt) return redirect(resultPath("notfound"));

  let postPayload: Record<string, unknown> = {};
  try {
    if (req.method === "POST") {
      const ct = req.headers.get("content-type") ?? "";
      if (ct.includes("application/json")) postPayload = await req.json();
      else if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
        const fd = await req.formData();
        for (const [k, v] of fd.entries()) postPayload[k] = String(v);
      }
    }
  } catch {}
  for (const [k, v] of url.searchParams.entries()) postPayload[k] = v;

  if (result === "cancel" || result === "fail") {
    await admin.from("payment_attempts").update({
      status: "failed",
      raw_payload: { ...attempt.raw_payload, callback: postPayload, reason: result },
    }).eq("id", attemptId);
    return redirect(resultPath(result === "cancel" ? "cancelled" : "failed"));
  }

  const { data: gw } = await admin.from("payment_gateways").select("id, mode, config").eq("provider", "eps").maybeSingle();
  const { data: credRow } = gw
    ? await admin.from("payment_gateway_credentials").select("config").eq("gateway_id", gw.id).maybeSingle()
    : { data: null as any };
  const cfg = ((credRow?.config ?? gw?.config ?? {}) as Record<string, string>);
  const USERNAME = cfg.username, PASSWORD = cfg.password, HASH_KEY = cfg.hash_key;
  const sandbox = String(gw?.mode ?? "sandbox").toLowerCase() !== "live";
  const TOKEN_URL = sandbox
    ? "https://sandbox-pgapi.eps.com.bd/v1/Auth/GetToken"
    : "https://pgapi.eps.com.bd/v1/Auth/GetToken";
  const VERIFY_URL = sandbox
    ? "https://sandbox-pgapi.eps.com.bd/v1/EPSEngine/CheckMerchantTransactionStatus"
    : "https://pgapi.eps.com.bd/v1/EPSEngine/CheckMerchantTransactionStatus";
  if (!USERNAME || !PASSWORD || !HASH_KEY) return redirect(resultPath("unconfigured"));

  const txnId = merchantTxnId ?? (attempt.gateway_ref as string | null);
  if (!txnId) return redirect(resultPath("missing"));

  try {
    const tokRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-hash": epsHash(USERNAME, HASH_KEY) },
      body: JSON.stringify({ userName: USERNAME, password: PASSWORD }),
    });
    const tok = await tokRes.json().catch(() => ({}));
    const accessToken: string | undefined = tok.token ?? tok.Token ?? tok.accessToken;
    if (!accessToken) {
      await admin.from("payment_attempts").update({ status: "failed", raw_payload: tok }).eq("id", attemptId);
      return redirect(resultPath("error"));
    }
    const verifyRes = await fetch(`${VERIFY_URL}?merchantTransactionId=${encodeURIComponent(txnId)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json", "x-hash": epsHash(txnId, HASH_KEY), Authorization: `Bearer ${accessToken}` },
    });
    const verify = await verifyRes.json().catch(() => ({}));
    const ok = String(verify.Status ?? verify.status ?? "").toLowerCase() === "success";
    if (ok) {
      const ref = verify.EpsTransactionId ?? verify.epsTransactionId ?? txnId;
      await admin.from("payment_attempts").update({
        status: "success", gateway_ref: ref,
        raw_payload: { ...attempt.raw_payload, verify, callback: postPayload },
      }).eq("id", attemptId);
      await admin.rpc("activate_tenant_after_payment", {
        _tenant_id: attempt.tenant_id,
        _amount: Number(verify.Amount ?? verify.amount ?? attempt.amount),
        _gateway: "eps",
        _gateway_ref: ref,
      });
      return redirect(resultPath("success"));
    }
    await admin.from("payment_attempts").update({
      status: "failed",
      raw_payload: { ...attempt.raw_payload, verify, callback: postPayload },
    }).eq("id", attemptId);
    return redirect(resultPath("failed"));
  } catch (e) {
    await admin.from("payment_attempts").update({
      status: "failed",
      raw_payload: { error: (e as Error).message, callback: postPayload },
    }).eq("id", attemptId);
    return redirect(resultPath("error"));
  }
});
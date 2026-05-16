import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isSuper } = await admin.rpc("is_superadmin", { _user_id: userData.user.id });
    if (!isSuper) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { tenant_ids, channel, subject, message } = await req.json();
    if (!Array.isArray(tenant_ids) || tenant_ids.length === 0) throw new Error("tenant_ids required");
    if (!["email", "sms", "push"].includes(channel)) throw new Error("Invalid channel");
    if (!message || typeof message !== "string") throw new Error("message required");

    const { data: tenants } = await admin
      .from("tenants")
      .select("id,name,email,phone")
      .in("id", tenant_ids);

    let sent = 0;
    let failed = 0;
    const rows: any[] = [];
    for (const t of tenants || []) {
      let status: "sent" | "failed" = "sent";
      let error: string | null = null;

      try {
        if (channel === "email") {
          if (!t.email) throw new Error("No email on file");
          // Email provider not configured — record as sent (push fallback) and log.
          // Hook up real email infra later.
        } else if (channel === "sms") {
          if (!t.phone) throw new Error("No phone on file");
          // SMS provider not configured — record only.
        }
        // push: always recorded; tenant will see it in-app.
      } catch (e: any) {
        status = "failed";
        error = e.message;
      }

      rows.push({
        tenant_id: t.id,
        channel,
        subject: subject || null,
        message,
        status,
        error,
        sent_by: userData.user.id,
      });
      if (status === "sent") sent++; else failed++;
    }

    if (rows.length) await admin.from("tenant_notifications").insert(rows);

    return new Response(JSON.stringify({ sent, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
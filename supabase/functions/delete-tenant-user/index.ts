import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = claimsData.claims.sub as string;
    const { user_id } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (user_id === callerId) {
      return new Response(JSON.stringify({ error: "You cannot delete your own account" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: isSA } = await anonClient.rpc("is_superadmin", { _user_id: callerId });
    const { data: callerTenantId } = await anonClient.rpc("get_user_tenant_id", { _user_id: callerId });
    const { data: isMgr } = await anonClient.rpc("is_tenant_manager_or_above", { _user_id: callerId });

    // Authorization: superadmin OR (tenant manager AND target in same tenant AND target is not the tenant owner)
    if (!isSA) {
      if (!isMgr || !callerTenantId) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: targetProfile } = await admin
        .from("profiles").select("tenant_id").eq("user_id", user_id).maybeSingle();
      if (!targetProfile || targetProfile.tenant_id !== callerTenantId) {
        return new Response(JSON.stringify({ error: "Forbidden: user is not in your tenant" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: tenantRow } = await admin
        .from("tenants").select("owner_user_id").eq("id", callerTenantId).maybeSingle();
      if (tenantRow?.owner_user_id === user_id) {
        return new Response(JSON.stringify({ error: "Cannot delete the tenant owner" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    await admin.from("user_roles").delete().eq("user_id", user_id);
    await admin.from("profiles").delete().eq("user_id", user_id);
    const { error: delErr } = await admin.auth.admin.deleteUser(user_id);
    if (delErr) {
      return new Response(JSON.stringify({ error: delErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
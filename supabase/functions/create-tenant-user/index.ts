import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify caller is superadmin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = claimsData.claims.sub;

    // Allow superadmin OR tenant manager (scoped to their own tenant)
    const { data: isSA } = await anonClient.rpc("is_superadmin", { _user_id: callerId });
    const { data: isTM } = await anonClient.rpc("is_tenant_manager_or_above", { _user_id: callerId });
    if (!isSA && !isTM) {
      return new Response(JSON.stringify({ error: "Forbidden: Tenant Manager or Superadmin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { email, password, display_name, role_name } = body;
    let { tenant_id } = body;

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email and password are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tenant Managers can only add users to their own tenant. Force tenant_id.
    if (!isSA) {
      const { data: callerTenantId } = await anonClient.rpc("get_user_tenant_id", { _user_id: callerId });
      if (!callerTenantId) {
        return new Response(JSON.stringify({ error: "No tenant context for caller" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      tenant_id = callerTenantId;
      // Tenant Managers must not be able to assign Superadmin role
      if (role_name === "Superadmin") {
        return new Response(JSON.stringify({ error: "Cannot assign Superadmin role" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Use service role to create user
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: display_name || email },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newUserId = userData.user.id;

    // Link the new staff user to the requested tenant
    if (tenant_id) {
      const { error: profileErr } = await adminClient
        .from("profiles")
        .upsert(
          { user_id: newUserId, display_name: display_name || email, tenant_id },
          { onConflict: "user_id" }
        );
      if (profileErr) {
        return new Response(JSON.stringify({ error: `Profile link failed: ${profileErr.message}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // The handle_new_user trigger auto-creates a tenant for every signup.
      // For staff invites, remove that orphan tenant so only the assigned tenant remains.
      await adminClient
        .from("tenants")
        .delete()
        .eq("owner_user_id", newUserId)
        .neq("id", tenant_id);

      // Always clear roles auto-assigned by handle_new_user (Tenant Manager is
      // assigned to every signup). Staff invites must start with no role unless
      // the inviter explicitly picked one — Ultimate POS flow.
      await adminClient.from("user_roles").delete().eq("user_id", newUserId);

      if (role_name) {
        // Match the role inside the target tenant; fall back to a system role with that name.
        const { data: tenantRole } = await adminClient
          .from("roles")
          .select("id")
          .eq("name", role_name)
          .eq("tenant_id", tenant_id)
          .maybeSingle();
        let roleId = tenantRole?.id;
        if (!roleId) {
          const { data: sysRole } = await adminClient
            .from("roles")
            .select("id")
            .eq("name", role_name)
            .is("tenant_id", null)
            .maybeSingle();
          roleId = sysRole?.id;
        }
        if (roleId) {
          await adminClient.from("user_roles").insert({ user_id: newUserId, role_id: roleId, tenant_id });
        }
      }
    }

    return new Response(JSON.stringify({ user_id: newUserId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

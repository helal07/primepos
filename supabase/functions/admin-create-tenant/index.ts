import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Superadmin-only endpoint that mirrors the public tenant-signup flow.
 * - Verifies caller is Superadmin.
 * - Creates auth user (handle_new_user trigger auto-creates a tenant + profile + role).
 * - Updates that auto-created tenant with full business details.
 * - Optionally records an approved payment when status = active.
 * Returns { tenant_id, user_id }.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const anon = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await anon.auth.getClaims(token);
    if (claimsErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);

    const { data: isSA } = await anon.rpc("is_superadmin", { _user_id: claims.claims.sub });
    if (!isSA) return json({ error: "Forbidden: Superadmin only" }, 403);

    const body = await req.json();
    const {
      admin_email,
      admin_password,
      admin_display_name,
      tenant: tenantInput,
      choice: rawChoice,
      payment,
    } = body ?? {};

    if (!admin_email || !admin_password || !tenantInput?.name) {
      return json({ error: "admin_email, admin_password and tenant.name are required" }, 400);
    }
    if (
      typeof admin_password !== "string" ||
      admin_password.length < 8 ||
      !/[A-Za-z]/.test(admin_password) ||
      !/[0-9]/.test(admin_password)
    ) {
      return json(
        { error: "Password must be at least 8 characters and include letters and numbers" },
        400,
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(admin_email))) {
      return json({ error: "Invalid admin email" }, 400);
    }
    if (String(tenantInput.name).length > 200) {
      return json({ error: "Tenant name too long" }, 400);
    }

    const choice: "trial" | "paid" | "active" =
      rawChoice === "active" ? "active" : rawChoice === "paid" ? "paid" : "trial";

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    // Resolve package (optional) for duration
    let pkg: { id: string; price: number; duration_days: number } | null = null;
    if (tenantInput.package_id) {
      const { data: p } = await admin
        .from("saas_packages")
        .select("id, price, duration_days")
        .eq("id", tenantInput.package_id)
        .maybeSingle();
      pkg = (p as any) ?? null;
    }

    const emailLc = String(admin_email).toLowerCase();

    // Reject duplicate email up-front
    let existingUserId: string | null = null;
    for (let page = 1; page <= 20; page++) {
      const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (listErr) break;
      const found = list.users.find((u) => (u.email ?? "").toLowerCase() === emailLc);
      if (found) { existingUserId = found.id; break; }
      if (!list.users.length || list.users.length < 200) break;
    }
    if (existingUserId) {
      return json(
        { error: "An account with this email already exists.", code: "email_exists" },
        409,
      );
    }

    const displayName = admin_display_name || tenantInput.name;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: emailLc,
      password: admin_password,
      email_confirm: true,
      user_metadata: { display_name: displayName, full_name: displayName },
    });
    if (createErr || !created.user) {
      const msg = createErr?.message ?? "Could not create user";
      const isDup = /already.*registered|already exists|email_exists/i.test(msg);
      return json(
        { error: isDup ? "An account with this email already exists." : msg, code: isDup ? "email_exists" : undefined },
        isDup ? 409 : 400,
      );
    }
    const userId = created.user.id;

    // Find auto-created tenant (handle_new_user trigger)
    const { data: autoTenant } = await admin
      .from("tenants")
      .select("id")
      .eq("owner_user_id", userId)
      .maybeSingle();

    const today = new Date();
    const startDate = tenantInput.subscription_start || today.toISOString().slice(0, 10);
    let endDate: string | null = tenantInput.subscription_end || null;
    if (!endDate) {
      const days =
        choice === "trial" ? 14 : (pkg?.duration_days ?? 30);
      endDate = new Date(today.getTime() + days * 86_400_000).toISOString().slice(0, 10);
    }

    const status =
      tenantInput.status ??
      (choice === "trial" ? "trial" : choice === "active" ? "active" : "pending");

    const tenantPatch: Record<string, unknown> = {
      name: tenantInput.name,
      company_name: tenantInput.company_name ?? tenantInput.name,
      email: tenantInput.email ?? emailLc,
      phone: tenantInput.phone ?? null,
      address: tenantInput.address ?? null,
      domain: tenantInput.domain ?? null,
      package_id: pkg?.id ?? tenantInput.package_id ?? null,
      subscription_type: tenantInput.subscription_type ?? "monthly",
      subscription_start: startDate,
      subscription_end: endDate,
      status,
      notes: tenantInput.notes ?? null,
    };

    let tenantId: string | null = autoTenant?.id ?? null;
    if (autoTenant?.id) {
      const { error: upErr } = await admin.from("tenants").update(tenantPatch).eq("id", autoTenant.id);
      if (upErr) {
        await admin.auth.admin.deleteUser(userId).catch(() => {});
        return json({ error: upErr.message }, 400);
      }
    } else {
      const { data: t, error: tErr } = await admin
        .from("tenants")
        .insert({ ...tenantPatch, owner_user_id: userId })
        .select("id")
        .single();
      if (tErr || !t) {
        await admin.auth.admin.deleteUser(userId).catch(() => {});
        return json({ error: tErr?.message ?? "Could not create tenant" }, 400);
      }
      tenantId = t.id;
      await admin
        .from("profiles")
        .upsert(
          { user_id: userId, display_name: displayName, tenant_id: t.id },
          { onConflict: "user_id" },
        );
    }

    // Update profile contact info
    await admin
      .from("profiles")
      .update({
        display_name: displayName,
        phone: tenantInput.phone ?? null,
        address: tenantInput.address ?? null,
      })
      .eq("user_id", userId);

    // Optional: record payment when activated immediately
    if (choice === "active" && tenantId && payment?.amount) {
      await admin.from("tenant_payments").insert({
        tenant_id: tenantId,
        package_id: pkg?.id ?? tenantInput.package_id ?? null,
        amount: Number(payment.amount),
        currency: "BDT",
        payment_method: payment.method ?? "manual",
        status: "approved",
        starts_on: startDate,
        ends_on: endDate,
        approved_at: new Date().toISOString(),
      });
    }

    return json({ ok: true, tenant_id: tenantId, user_id: userId, choice });
  } catch (e: any) {
    return json({ error: e?.message ?? "Unknown error" }, 500);
  }
});
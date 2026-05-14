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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      businessName,
      contactName,
      contactEmail,
      contactPhone,
      address,
      password,
      registrationChoice,
      packageId,
    } = body ?? {};

    if (!businessName || !contactEmail || !password || !contactName) {
      return json({ error: "Missing required fields" }, 400);
    }
    if (typeof password !== "string" || password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return json({ error: "Password must be at least 8 characters and include letters and numbers" }, 400);
    }
    if (typeof contactEmail !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return json({ error: "Invalid email address" }, 400);
    }
    if (String(businessName).length > 200 || String(contactName).length > 120) {
      return json({ error: "Name fields too long" }, 400);
    }

    let choice: "trial" | "paid" = registrationChoice === "paid" ? "paid" : "trial";

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    // Validate package for paid choice
    let pkg: { id: string; price: number; duration_days: number; is_trial: boolean } | null = null;
    if (choice === "paid") {
      if (!packageId) return json({ error: "packageId required for paid registration" }, 400);
      const { data: p } = await admin
        .from("saas_packages")
        .select("id, price, duration_days, is_trial")
        .eq("id", packageId)
        .eq("is_active", true)
        .maybeSingle();
      if (!p) return json({ error: "Selected plan not found" }, 400);
      pkg = p as any;
      // If the chosen plan is a trial plan, treat signup as trial (instant access, no payment)
      if ((pkg as any).is_trial) choice = "trial";
    } else {
      // For trial without packageId, prefer a plan flagged as trial; otherwise fall back to the cheapest active plan
      const { data: trialPkg } = await admin
        .from("saas_packages")
        .select("id, price, duration_days, is_trial")
        .eq("is_active", true)
        .eq("is_trial", true)
        .order("sort_order")
        .limit(1)
        .maybeSingle();
      if (trialPkg) {
        pkg = trialPkg as any;
      } else {
        const { data: p } = await admin
          .from("saas_packages")
          .select("id, price, duration_days, is_trial")
          .eq("is_active", true)
          .order("sort_order")
          .limit(1)
          .maybeSingle();
        pkg = (p as any) ?? null;
      }
    }

    const emailLc = String(contactEmail).toLowerCase();

    // Check for existing user
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
        { error: "An account with this email already exists. Please sign in instead.", code: "email_exists" },
        409,
      );
    }

    // Create auth user (handle_new_user trigger auto-creates a tenant + profile + Tenant Manager role)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: emailLc,
      password,
      email_confirm: true,
      user_metadata: { display_name: contactName, full_name: contactName },
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

    // The trigger created a tenant — fetch it and update with full details
    const { data: autoTenant } = await admin
      .from("tenants")
      .select("id")
      .eq("owner_user_id", userId)
      .maybeSingle();

    const now = new Date();
    const durationDays = pkg?.duration_days ?? 14;
    // Trial duration: prefer the trial plan's duration_days; fall back to 14
    const trialDays = choice === "trial" ? (pkg?.is_trial ? pkg.duration_days : (pkg?.duration_days ?? 14)) : 14;
    const subEnd = new Date(now.getTime() + (choice === "trial" ? trialDays : durationDays) * 86_400_000);

    const tenantPatch: Record<string, unknown> = {
      name: businessName,
      company_name: businessName,
      email: emailLc,
      phone: contactPhone ?? null,
      address: address ?? null,
      package_id: pkg?.id ?? null,
      status: choice === "trial" ? "trial" : "pending",
      subscription_type: "monthly",
      subscription_start: now.toISOString().slice(0, 10),
      subscription_end: subEnd.toISOString().slice(0, 10),
    };

    let tenantId: string | null = autoTenant?.id ?? null;
    if (autoTenant?.id) {
      await admin.from("tenants").update(tenantPatch).eq("id", autoTenant.id);
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
      // Make sure profile is linked
      await admin
        .from("profiles")
        .upsert({ user_id: userId, display_name: contactName, tenant_id: t.id }, { onConflict: "user_id" });
    }

    // Update profile contact info
    await admin
      .from("profiles")
      .update({ display_name: contactName, phone: contactPhone ?? null, address: address ?? null })
      .eq("user_id", userId);

    return json({
      ok: true,
      tenant_id: tenantId,
      choice,
      trial_days: choice === "trial" ? trialDays : null,
    });
  } catch (e: any) {
    return json({ error: e?.message ?? "Unknown error" }, 500);
  }
});
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(
      auth.replace("Bearer ", ""),
    );
    if (claimsErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: profile } = await admin
      .from("profiles").select("tenant_id").eq("user_id", userId).maybeSingle();
    const tenantId = profile?.tenant_id;
    if (!tenantId) return json({ error: "No tenant" }, 403);

    const { data: tenant } = await admin
      .from("tenants").select("id,name,owner_user_id").eq("id", tenantId).maybeSingle();
    const { data: isSuper } = await admin.rpc("is_superadmin", { _user_id: userId });
    if (!isSuper && (!tenant || tenant.owner_user_id !== userId)) {
      return json({ error: "Only tenant owner may restore" }, 403);
    }

    const body = await req.json().catch(() => null);
    if (!body) return json({ error: "Invalid body" }, 400);

    let payload: any = null;

    if (body.payload) {
      payload = body.payload;
    } else if (body.snapshot_path) {
      // Validate the snapshot belongs to this tenant
      const { data: snap } = await admin
        .from("tenant_backups")
        .select("id,tenant_id,storage_path")
        .eq("storage_path", body.snapshot_path)
        .maybeSingle();
      if (!snap || (snap.tenant_id !== tenantId && !isSuper)) {
        return json({ error: "Snapshot not found" }, 404);
      }
      const { data: file, error: dlErr } = await admin.storage
        .from("tenant-backups")
        .download(snap.storage_path);
      if (dlErr || !file) return json({ error: "Snapshot download failed" }, 500);
      payload = JSON.parse(await file.text());
    } else {
      return json({ error: "Provide payload or snapshot_path" }, 400);
    }

    if (!payload?.tables) return json({ error: "Invalid backup payload" }, 400);

    // Take a pre-restore safety snapshot
    try {
      const safety = await buildPayload(admin, tenantId, tenant);
      const safetyJson = JSON.stringify(safety);
      const path = `${tenantId}/pre-restore-${Date.now()}.json`;
      await admin.storage.from("tenant-backups").upload(path, new Blob([safetyJson], { type: "application/json" }), { upsert: true });
      await admin.from("tenant_backups").insert({
        tenant_id: tenantId,
        kind: "pre_restore_snapshot",
        storage_path: path,
        size_bytes: new TextEncoder().encode(safetyJson).byteLength,
        row_counts: safety.row_counts,
        created_by: userId,
        notes: "Auto-saved before restore",
      });
    } catch (_e) { /* non-fatal */ }

    // Force tenant_id to caller in payload (defense in depth)
    const safeTables: Record<string, any[]> = {};
    for (const [name, rows] of Object.entries(payload.tables ?? {})) {
      if (!Array.isArray(rows)) continue;
      safeTables[name] = (rows as any[]).map((r) => ({ ...r, tenant_id: tenantId }));
    }

    // Use a user-scoped client so auth.uid() inside the function = caller
    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: result, error } = await callerClient.rpc(
      "restore_tenant_from_backup",
      { p_payload: { ...payload, tables: safeTables, tenant_id: tenantId } },
    );
    if (error) return json({ error: error.message }, 500);

    return json({ ok: true, result });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

async function buildPayload(admin: any, tenantId: string, tenant: any) {
  const { data: tableRows } = await admin.rpc("list_tenant_data_tables");
  const tables: string[] = (tableRows ?? []).map((r: any) => r.table_name);
  const tablesData: Record<string, any[]> = {};
  const rowCounts: Record<string, number> = {};
  for (const t of tables) {
    const all: any[] = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await admin
        .from(t).select("*").eq("tenant_id", tenantId).range(from, from + pageSize - 1);
      if (error) break;
      if (!data || data.length === 0) break;
      all.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
    }
    if (all.length > 0) {
      tablesData[t] = all;
      rowCounts[t] = all.length;
    }
  }
  return {
    schema_version: 1,
    exported_at: new Date().toISOString(),
    tenant_id: tenantId,
    tenant_snapshot: tenant,
    row_counts: rowCounts,
    tables: tablesData,
  };
}

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
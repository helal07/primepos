import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const KEEP = 2; // keep last 2 snapshots per tenant

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: tenants, error: tErr } = await admin
      .from("tenants")
      .select("id,name,slug,status")
      .neq("status", "suspended");
    if (tErr) return json({ error: tErr.message }, 500);

    const summary: any[] = [];
    for (const t of tenants ?? []) {
      try {
        const payload = await buildPayload(admin, t.id, t);
        const json_str = JSON.stringify(payload);
        const date = new Date().toISOString().split("T")[0];
        const path = `${t.id}/snapshot-${date}.json`;
        const { error: upErr } = await admin.storage
          .from("tenant-backups")
          .upload(path, new Blob([json_str], { type: "application/json" }), { upsert: true });
        if (upErr) {
          summary.push({ tenant: t.id, ok: false, error: upErr.message });
          continue;
        }
        await admin.from("tenant_backups").insert({
          tenant_id: t.id,
          kind: "snapshot",
          storage_path: path,
          size_bytes: new TextEncoder().encode(json_str).byteLength,
          row_counts: payload.row_counts,
        });

        // prune older snapshots beyond KEEP
        const { data: olds } = await admin
          .from("tenant_backups")
          .select("id,storage_path,created_at")
          .eq("tenant_id", t.id)
          .eq("kind", "snapshot")
          .order("created_at", { ascending: false });
        const remove = (olds ?? []).slice(KEEP);
        if (remove.length > 0) {
          const paths = remove.map((r: any) => r.storage_path).filter(Boolean);
          if (paths.length) await admin.storage.from("tenant-backups").remove(paths);
          await admin.from("tenant_backups").delete().in("id", remove.map((r: any) => r.id));
        }

        summary.push({ tenant: t.id, ok: true, rows: payload.row_counts });
      } catch (e) {
        summary.push({ tenant: t.id, ok: false, error: (e as Error).message });
      }
    }

    return json({ ok: true, summary });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

async function buildPayload(admin: any, tenantId: string, tenant: any) {
  const { data: tableRows } = await admin.rpc("list_tenant_data_tables");
  const tables: string[] = (tableRows ?? []).map((r: any) => r.table_name);
  const tablesData: Record<string, any[]> = {};
  const rowCounts: Record<string, number> = {};
  for (const tname of tables) {
    const all: any[] = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await admin
        .from(tname).select("*").eq("tenant_id", tenantId).range(from, from + pageSize - 1);
      if (error) break;
      if (!data || data.length === 0) break;
      all.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
    }
    if (all.length > 0) {
      tablesData[tname] = all;
      rowCounts[tname] = all.length;
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
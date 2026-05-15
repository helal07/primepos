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
    if (!auth?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
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
      .from("tenants").select("id,name,slug,owner_user_id").eq("id", tenantId).maybeSingle();
    if (!tenant || tenant.owner_user_id !== userId) {
      // allow superadmin
      const { data: isSuper } = await admin.rpc("is_superadmin", { _user_id: userId });
      if (!isSuper) return json({ error: "Only tenant owner may export" }, 403);
    }

    const { data: tableRows, error: listErr } = await admin.rpc("list_tenant_data_tables");
    if (listErr) return json({ error: listErr.message }, 500);
    const tables: string[] = (tableRows ?? []).map((r: any) => r.table_name);

    const tablesData: Record<string, any[]> = {};
    const rowCounts: Record<string, number> = {};
    for (const t of tables) {
      // page in 1000-row chunks
      const all: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await admin
          .from(t)
          .select("*")
          .eq("tenant_id", tenantId)
          .range(from, from + pageSize - 1);
        if (error) {
          // skip tables we can't read
          break;
        }
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

    const payload = {
      schema_version: 1,
      exported_at: new Date().toISOString(),
      tenant_id: tenantId,
      tenant_snapshot: tenant,
      row_counts: rowCounts,
      tables: tablesData,
    };

    const json_str = JSON.stringify(payload);
    const size = new TextEncoder().encode(json_str).byteLength;

    await admin.from("tenant_backups").insert({
      tenant_id: tenantId,
      kind: "manual_export",
      size_bytes: size,
      row_counts: rowCounts,
      created_by: userId,
    });

    const filename = `tenant-backup-${tenant?.slug ?? tenantId}-${new Date()
      .toISOString().split("T")[0]}.json`;
    return new Response(json_str, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
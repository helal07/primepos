
-- ============ tenant_backups table ============
CREATE TABLE IF NOT EXISTS public.tenant_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('manual_export','snapshot','pre_restore_snapshot','restore')),
  storage_path text,
  size_bytes bigint,
  row_counts jsonb,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_backups_tenant_created
  ON public.tenant_backups (tenant_id, created_at DESC);

ALTER TABLE public.tenant_backups ENABLE ROW LEVEL SECURITY;

-- Owner can view; superadmin can view all
CREATE POLICY "Tenant owner can view own backups"
  ON public.tenant_backups FOR SELECT
  USING (
    public.is_superadmin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id = tenant_backups.tenant_id
        AND t.owner_user_id = auth.uid()
    )
  );

-- Inserts/deletes only via service role (edge functions). No RLS insert/update/delete policies for normal users.

-- ============ Storage bucket ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-backups', 'tenant-backups', false)
ON CONFLICT (id) DO NOTHING;

-- No public policies; service role used by edge functions handles all access.

-- ============ Helper: list tenant-scoped tables ============
CREATE OR REPLACE FUNCTION public.list_tenant_data_tables()
RETURNS TABLE (table_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.table_name::text
  FROM information_schema.columns c
  JOIN information_schema.tables t
    ON t.table_schema = c.table_schema AND t.table_name = c.table_name
  WHERE c.table_schema = 'public'
    AND c.column_name = 'tenant_id'
    AND t.table_type = 'BASE TABLE'
    AND c.table_name NOT IN (
      'tenants',
      'tenant_backups',
      'tenant_actions_log',
      'tenant_payments',
      'sms_purchases'
    )
  ORDER BY c.table_name;
$$;

-- ============ Restore function ============
CREATE OR REPLACE FUNCTION public.restore_tenant_from_backup(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_tenant uuid;
  v_table text;
  v_rows jsonb;
  v_count int;
  v_total int := 0;
  v_deleted int := 0;
  v_is_super boolean;
BEGIN
  v_is_super := public.is_superadmin(auth.uid());
  v_caller_tenant := public.get_user_tenant_id(auth.uid());

  IF v_caller_tenant IS NULL AND NOT v_is_super THEN
    RAISE EXCEPTION 'No tenant context';
  END IF;

  -- Only tenant owner (or superadmin) may restore
  IF NOT v_is_super THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id = v_caller_tenant AND t.owner_user_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Only the tenant owner may restore';
    END IF;
  END IF;

  IF p_payload IS NULL OR p_payload->'tables' IS NULL THEN
    RAISE EXCEPTION 'Invalid backup payload';
  END IF;

  -- Disable triggers/FKs for the duration of this transaction
  PERFORM set_config('session_replication_role', 'replica', true);

  -- DELETE phase: wipe all tenant-scoped rows for this tenant
  FOR v_table IN SELECT table_name FROM public.list_tenant_data_tables() LOOP
    BEGIN
      EXECUTE format('DELETE FROM public.%I WHERE tenant_id = $1', v_table)
        USING v_caller_tenant;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      v_deleted := v_deleted + v_count;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Delete failed for %: %', v_table, SQLERRM;
    END;
  END LOOP;

  -- INSERT phase: restore from payload, forcing tenant_id
  FOR v_table, v_rows IN
    SELECT key, value FROM jsonb_each(p_payload->'tables')
  LOOP
    -- only tables that exist & have tenant_id & are in the allowed set
    IF NOT EXISTS (
      SELECT 1 FROM public.list_tenant_data_tables() t WHERE t.table_name = v_table
    ) THEN
      CONTINUE;
    END IF;

    IF jsonb_typeof(v_rows) <> 'array' OR jsonb_array_length(v_rows) = 0 THEN
      CONTINUE;
    END IF;

    BEGIN
      EXECUTE format($f$
        INSERT INTO public.%I
        SELECT (jsonb_populate_record(
                  null::public.%I,
                  row_data || jsonb_build_object('tenant_id', $1::text)
                )).*
        FROM jsonb_array_elements($2) AS row_data
      $f$, v_table, v_table)
      USING v_caller_tenant, v_rows;

      GET DIAGNOSTICS v_count = ROW_COUNT;
      v_total := v_total + v_count;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Insert failed for %: %', v_table, SQLERRM;
    END;
  END LOOP;

  PERFORM set_config('session_replication_role', 'origin', true);

  -- Log the restore
  INSERT INTO public.tenant_backups (tenant_id, kind, row_counts, created_by, notes)
  VALUES (
    v_caller_tenant,
    'restore',
    jsonb_build_object('inserted', v_total, 'deleted', v_deleted),
    auth.uid(),
    'Tenant restored from backup'
  );

  RETURN jsonb_build_object(
    'tenant_id', v_caller_tenant,
    'inserted_rows', v_total,
    'deleted_rows', v_deleted
  );
END;
$$;

-- Restrict execution
REVOKE ALL ON FUNCTION public.restore_tenant_from_backup(jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.restore_tenant_from_backup(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_tenant_data_tables() TO authenticated, service_role;

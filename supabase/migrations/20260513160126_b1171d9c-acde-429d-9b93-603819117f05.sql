CREATE OR REPLACE FUNCTION public.set_tenant_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.get_user_tenant_id(auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.column_name = 'tenant_id'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.table_name);

    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_tenant_id_isolation ON public.%I', r.table_name);
    EXECUTE format(
      'CREATE TRIGGER trg_set_tenant_id_isolation BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id()',
      r.table_name
    );
  END LOOP;
END $$;

DO $$
DECLARE
  r record;
  select_expr text;
  write_expr text;
BEGIN
  FOR r IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.column_name = 'tenant_id'
  LOOP
    IF r.table_name = 'roles' THEN
      select_expr := 'public.is_superadmin(auth.uid()) OR tenant_id = public.get_user_tenant_id(auth.uid()) OR (tenant_id IS NULL AND is_system = true AND name <> ''Superadmin'')';
      write_expr := 'public.is_superadmin(auth.uid()) OR (tenant_id = public.get_user_tenant_id(auth.uid()) AND is_system = false)';
    ELSIF r.table_name = 'role_permissions' THEN
      select_expr := 'public.is_superadmin(auth.uid()) OR tenant_id = public.get_user_tenant_id(auth.uid()) OR EXISTS (SELECT 1 FROM public.roles r WHERE r.id = role_permissions.role_id AND r.tenant_id IS NULL AND r.is_system = true AND r.name <> ''Superadmin'')';
      write_expr := 'public.is_superadmin(auth.uid()) OR (tenant_id = public.get_user_tenant_id(auth.uid()) AND EXISTS (SELECT 1 FROM public.roles r WHERE r.id = role_permissions.role_id AND r.tenant_id = public.get_user_tenant_id(auth.uid())))';
    ELSE
      select_expr := 'public.is_superadmin(auth.uid()) OR tenant_id = public.get_user_tenant_id(auth.uid())';
      write_expr := select_expr;
    END IF;

    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_select ON public.%I', r.table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_insert ON public.%I', r.table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_update ON public.%I', r.table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_delete ON public.%I', r.table_name);

    EXECUTE format(
      'CREATE POLICY tenant_isolation_select ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING (%s)',
      r.table_name,
      select_expr
    );
    EXECUTE format(
      'CREATE POLICY tenant_isolation_insert ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (%s)',
      r.table_name,
      write_expr
    );
    EXECUTE format(
      'CREATE POLICY tenant_isolation_update ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)',
      r.table_name,
      write_expr,
      write_expr
    );
    EXECUTE format(
      'CREATE POLICY tenant_isolation_delete ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (%s)',
      r.table_name,
      write_expr
    );
  END LOOP;
END $$;

-- Helper to keep policies consistent
DO $$
DECLARE
  rec record;
  spec record;
BEGIN
  -- (table, module, child_action_uses_parent_module)
  FOR spec IN
    SELECT * FROM (VALUES
      ('products','products'),
      ('product_variations','products'),
      ('brands','brands'),
      ('categories','categories'),
      ('units','units'),
      ('sales','sales'),
      ('sale_items','sales'),
      ('sale_payments','sales'),
      ('shipments','sales'),
      ('purchases','purchases'),
      ('purchase_items','purchases'),
      ('purchase_orders','purchases'),
      ('purchase_order_items','purchases'),
      ('purchase_payments','purchases'),
      ('customers','customers'),
      ('customer_groups','customers'),
      ('suppliers','suppliers'),
      ('accounts','accounting'),
      ('journal_entries','accounting'),
      ('journal_entry_lines','accounting'),
      ('transactions','accounting'),
      ('employees','hrm'),
      ('attendance','hrm'),
      ('leave_requests','hrm'),
      ('payroll','hrm'),
      ('warranties','warranty'),
      ('warranty_claims','warranty'),
      ('cms_pages','cms')
    ) AS t(tbl, module)
  LOOP
    -- Drop existing PERMISSIVE write policies (keep tenant_isolation_* RESTRICTIVE policies)
    FOR rec IN
      SELECT policyname FROM pg_policies
      WHERE schemaname='public' AND tablename = spec.tbl
        AND permissive='PERMISSIVE'
        AND cmd IN ('INSERT','UPDATE','DELETE')
        AND policyname NOT LIKE 'tenant_isolation_%'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', rec.policyname, spec.tbl);
    END LOOP;

    -- Recreate uniform policies
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
      AS PERMISSIVE FOR INSERT TO authenticated
      WITH CHECK (
        (public.is_superadmin(auth.uid()) OR tenant_id = public.get_user_tenant_id(auth.uid()))
        AND (public.is_tenant_manager_or_above(auth.uid()) OR public.has_module_permission(auth.uid(), %L, 'create'))
      )
    $f$, spec.tbl || '_perm_insert', spec.tbl, spec.module);

    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
      AS PERMISSIVE FOR UPDATE TO authenticated
      USING (
        (public.is_superadmin(auth.uid()) OR tenant_id = public.get_user_tenant_id(auth.uid()))
        AND (public.is_tenant_manager_or_above(auth.uid()) OR public.has_module_permission(auth.uid(), %L, 'edit'))
      )
      WITH CHECK (
        (public.is_superadmin(auth.uid()) OR tenant_id = public.get_user_tenant_id(auth.uid()))
        AND (public.is_tenant_manager_or_above(auth.uid()) OR public.has_module_permission(auth.uid(), %L, 'edit'))
      )
    $f$, spec.tbl || '_perm_update', spec.tbl, spec.module, spec.module);

    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
      AS PERMISSIVE FOR DELETE TO authenticated
      USING (
        (public.is_superadmin(auth.uid()) OR tenant_id = public.get_user_tenant_id(auth.uid()))
        AND (public.is_tenant_manager_or_above(auth.uid()) OR public.has_module_permission(auth.uid(), %L, 'delete'))
      )
    $f$, spec.tbl || '_perm_delete', spec.tbl, spec.module);
  END LOOP;
END $$;

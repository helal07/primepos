DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tenants'
      AND policyname = 'Tenant members can view their tenant'
  ) THEN
    CREATE POLICY "Tenant members can view their tenant"
    ON public.tenants
    FOR SELECT
    TO authenticated
    USING (id = public.get_user_tenant_id(auth.uid()));
  END IF;
END $$;
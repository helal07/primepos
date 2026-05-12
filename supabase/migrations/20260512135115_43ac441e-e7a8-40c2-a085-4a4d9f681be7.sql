
CREATE TABLE public.warranties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  name text NOT NULL,
  description text,
  duration integer NOT NULL DEFAULT 0,
  duration_type text NOT NULL DEFAULT 'days',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.warranties ENABLE ROW LEVEL SECURITY;

CREATE POLICY warranties_select ON public.warranties FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id(auth.uid())) OR is_superadmin(auth.uid()));

CREATE POLICY warranties_insert ON public.warranties FOR INSERT TO authenticated
  WITH CHECK (
    (is_tenant_manager_or_above(auth.uid()) OR has_module_permission(auth.uid(), 'products', 'create'))
    AND (tenant_id IS NULL OR tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()))
  );

CREATE POLICY warranties_update ON public.warranties FOR UPDATE TO authenticated
  USING (
    ((tenant_id = get_user_tenant_id(auth.uid())) OR is_superadmin(auth.uid()))
    AND (is_tenant_manager_or_above(auth.uid()) OR has_module_permission(auth.uid(), 'products', 'edit'))
  );

CREATE POLICY warranties_delete ON public.warranties FOR DELETE TO authenticated
  USING (
    ((tenant_id = get_user_tenant_id(auth.uid())) OR is_superadmin(auth.uid()))
    AND (is_tenant_manager_or_above(auth.uid()) OR has_module_permission(auth.uid(), 'products', 'delete'))
  );

CREATE TRIGGER warranties_set_tenant BEFORE INSERT ON public.warranties
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

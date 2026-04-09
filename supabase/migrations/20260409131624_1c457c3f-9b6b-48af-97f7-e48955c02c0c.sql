
-- Sale payments table
CREATE TABLE public.sale_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  payment_note text,
  tenant_id uuid REFERENCES public.tenants(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sp_select" ON public.sale_payments FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id(auth.uid())) OR is_superadmin(auth.uid()));

CREATE POLICY "sp_insert" ON public.sale_payments FOR INSERT TO authenticated
  WITH CHECK (is_tenant_manager_or_above(auth.uid()) OR has_module_permission(auth.uid(), 'sales', 'create'));

CREATE POLICY "sp_update" ON public.sale_payments FOR UPDATE TO authenticated
  USING (is_tenant_manager_or_above(auth.uid()) OR has_module_permission(auth.uid(), 'sales', 'edit'));

CREATE POLICY "sp_delete" ON public.sale_payments FOR DELETE TO authenticated
  USING (is_tenant_manager_or_above(auth.uid()) OR has_module_permission(auth.uid(), 'sales', 'delete'));

CREATE TRIGGER set_sale_payments_tenant_id BEFORE INSERT ON public.sale_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

-- Purchase payments table
CREATE TABLE public.purchase_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  payment_note text,
  tenant_id uuid REFERENCES public.tenants(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pp_select" ON public.purchase_payments FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id(auth.uid())) OR is_superadmin(auth.uid()));

CREATE POLICY "pp_insert" ON public.purchase_payments FOR INSERT TO authenticated
  WITH CHECK (is_tenant_manager_or_above(auth.uid()) OR has_module_permission(auth.uid(), 'purchases', 'create'));

CREATE POLICY "pp_update" ON public.purchase_payments FOR UPDATE TO authenticated
  USING (is_tenant_manager_or_above(auth.uid()) OR has_module_permission(auth.uid(), 'purchases', 'edit'));

CREATE POLICY "pp_delete" ON public.purchase_payments FOR DELETE TO authenticated
  USING (is_tenant_manager_or_above(auth.uid()) OR has_module_permission(auth.uid(), 'purchases', 'delete'));

CREATE TRIGGER set_purchase_payments_tenant_id BEFORE INSERT ON public.purchase_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

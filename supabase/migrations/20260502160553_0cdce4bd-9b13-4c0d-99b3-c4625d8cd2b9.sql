-- 1. Selling Price Groups
CREATE TABLE IF NOT EXISTS public.selling_price_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  tenant_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.selling_price_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS spg_select ON public.selling_price_groups;
DROP POLICY IF EXISTS spg_insert ON public.selling_price_groups;
DROP POLICY IF EXISTS spg_update ON public.selling_price_groups;
DROP POLICY IF EXISTS spg_delete ON public.selling_price_groups;
CREATE POLICY spg_select ON public.selling_price_groups FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id(auth.uid())) OR is_superadmin(auth.uid()));
CREATE POLICY spg_insert ON public.selling_price_groups FOR INSERT TO authenticated
  WITH CHECK (is_tenant_manager_or_above(auth.uid()) OR has_module_permission(auth.uid(), 'products', 'create'));
CREATE POLICY spg_update ON public.selling_price_groups FOR UPDATE TO authenticated
  USING (is_tenant_manager_or_above(auth.uid()) OR has_module_permission(auth.uid(), 'products', 'edit'));
CREATE POLICY spg_delete ON public.selling_price_groups FOR DELETE TO authenticated
  USING (is_tenant_manager_or_above(auth.uid()) OR has_module_permission(auth.uid(), 'products', 'delete'));

DROP TRIGGER IF EXISTS spg_set_tenant ON public.selling_price_groups;
DROP TRIGGER IF EXISTS spg_updated_at ON public.selling_price_groups;
CREATE TRIGGER spg_set_tenant BEFORE INSERT ON public.selling_price_groups
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER spg_updated_at BEFORE UPDATE ON public.selling_price_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Customer Groups
CREATE TABLE IF NOT EXISTS public.customer_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  selling_price_group_id uuid REFERENCES public.selling_price_groups(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  tenant_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cg_select ON public.customer_groups;
DROP POLICY IF EXISTS cg_insert ON public.customer_groups;
DROP POLICY IF EXISTS cg_update ON public.customer_groups;
DROP POLICY IF EXISTS cg_delete ON public.customer_groups;
CREATE POLICY cg_select ON public.customer_groups FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id(auth.uid())) OR is_superadmin(auth.uid()));
CREATE POLICY cg_insert ON public.customer_groups FOR INSERT TO authenticated
  WITH CHECK (is_tenant_manager_or_above(auth.uid()) OR has_module_permission(auth.uid(), 'contacts', 'can_create'));
CREATE POLICY cg_update ON public.customer_groups FOR UPDATE TO authenticated
  USING (is_tenant_manager_or_above(auth.uid()) OR has_module_permission(auth.uid(), 'contacts', 'can_edit'));
CREATE POLICY cg_delete ON public.customer_groups FOR DELETE TO authenticated
  USING (is_tenant_manager_or_above(auth.uid()) OR has_module_permission(auth.uid(), 'contacts', 'can_delete'));

DROP TRIGGER IF EXISTS cg_set_tenant ON public.customer_groups;
DROP TRIGGER IF EXISTS cg_updated_at ON public.customer_groups;
CREATE TRIGGER cg_set_tenant BEFORE INSERT ON public.customer_groups
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER cg_updated_at BEFORE UPDATE ON public.customer_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Per-product price overrides
CREATE TABLE IF NOT EXISTS public.product_group_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variation_id uuid REFERENCES public.product_variations(id) ON DELETE CASCADE,
  selling_price_group_id uuid NOT NULL REFERENCES public.selling_price_groups(id) ON DELETE CASCADE,
  price numeric NOT NULL DEFAULT 0,
  price_type text NOT NULL DEFAULT 'fixed' CHECK (price_type IN ('fixed','percent')),
  tenant_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS pgp_unique_product_group
  ON public.product_group_prices (product_id, COALESCE(variation_id, '00000000-0000-0000-0000-000000000000'::uuid), selling_price_group_id);

ALTER TABLE public.product_group_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pgp_select ON public.product_group_prices;
DROP POLICY IF EXISTS pgp_insert ON public.product_group_prices;
DROP POLICY IF EXISTS pgp_update ON public.product_group_prices;
DROP POLICY IF EXISTS pgp_delete ON public.product_group_prices;
CREATE POLICY pgp_select ON public.product_group_prices FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id(auth.uid())) OR is_superadmin(auth.uid()));
CREATE POLICY pgp_insert ON public.product_group_prices FOR INSERT TO authenticated
  WITH CHECK (is_tenant_manager_or_above(auth.uid()) OR has_module_permission(auth.uid(), 'products', 'create'));
CREATE POLICY pgp_update ON public.product_group_prices FOR UPDATE TO authenticated
  USING (is_tenant_manager_or_above(auth.uid()) OR has_module_permission(auth.uid(), 'products', 'edit'));
CREATE POLICY pgp_delete ON public.product_group_prices FOR DELETE TO authenticated
  USING (is_tenant_manager_or_above(auth.uid()) OR has_module_permission(auth.uid(), 'products', 'delete'));

DROP TRIGGER IF EXISTS pgp_set_tenant ON public.product_group_prices;
DROP TRIGGER IF EXISTS pgp_updated_at ON public.product_group_prices;
CREATE TRIGGER pgp_set_tenant BEFORE INSERT ON public.product_group_prices
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER pgp_updated_at BEFORE UPDATE ON public.product_group_prices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Link customers to a group
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS customer_group_id uuid REFERENCES public.customer_groups(id) ON DELETE SET NULL;

-- Categories
DROP POLICY IF EXISTS categories_insert ON public.categories;
DROP POLICY IF EXISTS categories_update ON public.categories;
DROP POLICY IF EXISTS categories_delete ON public.categories;

CREATE POLICY categories_insert ON public.categories FOR INSERT TO authenticated
WITH CHECK (
  (is_tenant_manager_or_above(auth.uid()) OR has_module_permission(auth.uid(), 'products', 'create'))
  AND (tenant_id IS NULL OR tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()))
);

CREATE POLICY categories_update ON public.categories FOR UPDATE TO authenticated
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()))
  AND (is_tenant_manager_or_above(auth.uid()) OR has_module_permission(auth.uid(), 'products', 'edit'))
)
WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

CREATE POLICY categories_delete ON public.categories FOR DELETE TO authenticated
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()))
  AND (is_tenant_manager_or_above(auth.uid()) OR has_module_permission(auth.uid(), 'products', 'delete'))
);

-- Brands
DROP POLICY IF EXISTS brands_insert ON public.brands;
DROP POLICY IF EXISTS brands_update ON public.brands;
DROP POLICY IF EXISTS brands_delete ON public.brands;

CREATE POLICY brands_insert ON public.brands FOR INSERT TO authenticated
WITH CHECK (
  (is_tenant_manager_or_above(auth.uid()) OR has_module_permission(auth.uid(), 'products', 'create'))
  AND (tenant_id IS NULL OR tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()))
);

CREATE POLICY brands_update ON public.brands FOR UPDATE TO authenticated
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()))
  AND (is_tenant_manager_or_above(auth.uid()) OR has_module_permission(auth.uid(), 'products', 'edit'))
)
WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

CREATE POLICY brands_delete ON public.brands FOR DELETE TO authenticated
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()))
  AND (is_tenant_manager_or_above(auth.uid()) OR has_module_permission(auth.uid(), 'products', 'delete'))
);

-- Units
DROP POLICY IF EXISTS units_insert ON public.units;
DROP POLICY IF EXISTS units_update ON public.units;
DROP POLICY IF EXISTS units_delete ON public.units;

CREATE POLICY units_insert ON public.units FOR INSERT TO authenticated
WITH CHECK (
  (is_tenant_manager_or_above(auth.uid()) OR has_module_permission(auth.uid(), 'products', 'create'))
  AND (tenant_id IS NULL OR tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()))
);

CREATE POLICY units_update ON public.units FOR UPDATE TO authenticated
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()))
  AND (is_tenant_manager_or_above(auth.uid()) OR has_module_permission(auth.uid(), 'products', 'edit'))
)
WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

CREATE POLICY units_delete ON public.units FOR DELETE TO authenticated
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()))
  AND (is_tenant_manager_or_above(auth.uid()) OR has_module_permission(auth.uid(), 'products', 'delete'))
);

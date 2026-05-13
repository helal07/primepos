-- Keep public storefront reads available for visitors only, not signed-in tenant admins
DROP POLICY IF EXISTS products_public_storefront_read ON public.products;
CREATE POLICY products_public_storefront_read
ON public.products
FOR SELECT
TO anon
USING (
  show_on_website = true
  AND is_active = true
  AND EXISTS (
    SELECT 1
    FROM public.store_settings s
    WHERE s.tenant_id = products.tenant_id
      AND s.enabled = true
  )
);

DROP POLICY IF EXISTS categories_public_storefront_read ON public.categories;
CREATE POLICY categories_public_storefront_read
ON public.categories
FOR SELECT
TO anon
USING (
  is_active = true
  AND EXISTS (
    SELECT 1
    FROM public.store_settings s
    WHERE s.tenant_id = categories.tenant_id
      AND s.enabled = true
  )
);

DROP POLICY IF EXISTS brands_public_storefront_read ON public.brands;
CREATE POLICY brands_public_storefront_read
ON public.brands
FOR SELECT
TO anon
USING (
  is_active = true
  AND EXISTS (
    SELECT 1
    FROM public.store_settings s
    WHERE s.tenant_id = brands.tenant_id
      AND s.enabled = true
  )
);

DROP POLICY IF EXISTS product_variations_public_storefront_read ON public.product_variations;
CREATE POLICY product_variations_public_storefront_read
ON public.product_variations
FOR SELECT
TO anon
USING (
  is_active = true
  AND EXISTS (
    SELECT 1
    FROM public.products p
    JOIN public.store_settings s ON s.tenant_id = p.tenant_id
    WHERE p.id = product_variations.product_id
      AND p.show_on_website = true
      AND p.is_active = true
      AND s.enabled = true
  )
);

-- Tighten product write permissions to the current tenant
DROP POLICY IF EXISTS products_insert ON public.products;
CREATE POLICY products_insert
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (
  (public.is_tenant_manager_or_above(auth.uid()) OR public.has_module_permission(auth.uid(), 'products', 'create'))
  AND (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.is_superadmin(auth.uid()))
);

DROP POLICY IF EXISTS products_update ON public.products;
CREATE POLICY products_update
ON public.products
FOR UPDATE
TO authenticated
USING (
  (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.is_superadmin(auth.uid()))
  AND (public.is_tenant_manager_or_above(auth.uid()) OR public.has_module_permission(auth.uid(), 'products', 'edit'))
)
WITH CHECK (
  (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.is_superadmin(auth.uid()))
  AND (public.is_tenant_manager_or_above(auth.uid()) OR public.has_module_permission(auth.uid(), 'products', 'edit'))
);

DROP POLICY IF EXISTS products_delete ON public.products;
CREATE POLICY products_delete
ON public.products
FOR DELETE
TO authenticated
USING (
  (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.is_superadmin(auth.uid()))
  AND (public.is_tenant_manager_or_above(auth.uid()) OR public.has_module_permission(auth.uid(), 'products', 'delete'))
);

-- Product/category tenant ownership should be mandatory
ALTER TABLE public.products ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.categories ALTER COLUMN tenant_id SET NOT NULL;
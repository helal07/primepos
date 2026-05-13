
DROP POLICY IF EXISTS products_public_storefront_read ON public.products;
DROP POLICY IF EXISTS categories_public_storefront_read ON public.categories;

CREATE POLICY products_public_storefront_read ON public.products
  FOR SELECT
  TO anon
  USING (
    show_on_website = true
    AND is_active = true
    AND EXISTS (
      SELECT 1 FROM public.store_settings s
      WHERE s.tenant_id = products.tenant_id AND s.enabled = true
    )
  );

CREATE POLICY categories_public_storefront_read ON public.categories
  FOR SELECT
  TO anon
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.store_settings s
      WHERE s.tenant_id = categories.tenant_id AND s.enabled = true
    )
  );

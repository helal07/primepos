
-- 1. Tenants slug
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS slug text;

-- Backfill slugs
UPDATE public.tenants
SET slug = lower(regexp_replace(coalesce(name, 'tenant-' || substr(id::text, 1, 8)), '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;

-- Ensure unique by appending short id where collision
WITH dups AS (
  SELECT id, slug, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at) AS rn
  FROM public.tenants
)
UPDATE public.tenants t
SET slug = t.slug || '-' || substr(t.id::text, 1, 6)
FROM dups
WHERE t.id = dups.id AND dups.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS tenants_slug_key ON public.tenants (slug);

-- 2. Products extras
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS website_description text,
  ADD COLUMN IF NOT EXISTS website_slug text,
  ADD COLUMN IF NOT EXISTS gallery_urls text[] NOT NULL DEFAULT ARRAY[]::text[];

CREATE INDEX IF NOT EXISTS products_website_slug_idx ON public.products (tenant_id, website_slug);

-- 3. store_settings
CREATE TABLE IF NOT EXISTS public.store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  theme text NOT NULL DEFAULT 'default',
  store_name text,
  tagline text,
  logo_url text,
  banner_url text,
  primary_color text,
  currency text NOT NULL DEFAULT 'BDT',
  contact_email text,
  contact_phone text,
  address text,
  facebook_url text,
  instagram_url text,
  whatsapp_number text,
  meta_title text,
  meta_description text,
  hero_heading text,
  hero_subheading text,
  hero_cta_label text,
  hero_cta_url text,
  about_html text,
  footer_html text,
  enable_cod boolean NOT NULL DEFAULT true,
  enable_sslcommerz boolean NOT NULL DEFAULT false,
  enable_bkash boolean NOT NULL DEFAULT false,
  shipping_flat_rate numeric NOT NULL DEFAULT 0,
  free_shipping_threshold numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "store_settings_public_read"
  ON public.store_settings FOR SELECT
  TO anon, authenticated
  USING (enabled = true OR tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

CREATE POLICY "store_settings_insert"
  ON public.store_settings FOR INSERT
  TO authenticated
  WITH CHECK (is_tenant_manager_or_above(auth.uid()) AND (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid())));

CREATE POLICY "store_settings_update"
  ON public.store_settings FOR UPDATE
  TO authenticated
  USING (is_tenant_manager_or_above(auth.uid()) AND (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid())));

CREATE POLICY "store_settings_delete"
  ON public.store_settings FOR DELETE
  TO authenticated
  USING (is_superadmin(auth.uid()));

CREATE TRIGGER trg_store_settings_set_tenant BEFORE INSERT ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER trg_store_settings_updated_at BEFORE UPDATE ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. store_collections
CREATE TABLE IF NOT EXISTS public.store_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  image_url text,
  sort_order int NOT NULL DEFAULT 0,
  is_featured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

ALTER TABLE public.store_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "store_collections_public_read"
  ON public.store_collections FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true AND EXISTS (
      SELECT 1 FROM public.store_settings s WHERE s.tenant_id = store_collections.tenant_id AND s.enabled = true
    )
    OR tenant_id = get_user_tenant_id(auth.uid())
    OR is_superadmin(auth.uid())
  );

CREATE POLICY "store_collections_insert"
  ON public.store_collections FOR INSERT
  TO authenticated
  WITH CHECK (is_tenant_manager_or_above(auth.uid()) AND (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid())));

CREATE POLICY "store_collections_update"
  ON public.store_collections FOR UPDATE
  TO authenticated
  USING (is_tenant_manager_or_above(auth.uid()) AND (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid())));

CREATE POLICY "store_collections_delete"
  ON public.store_collections FOR DELETE
  TO authenticated
  USING (is_tenant_manager_or_above(auth.uid()) AND (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid())));

CREATE TRIGGER trg_store_collections_set_tenant BEFORE INSERT ON public.store_collections
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER trg_store_collections_updated_at BEFORE UPDATE ON public.store_collections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. store_collection_products
CREATE TABLE IF NOT EXISTS public.store_collection_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  collection_id uuid NOT NULL REFERENCES public.store_collections(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collection_id, product_id)
);

ALTER TABLE public.store_collection_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scp_public_read"
  ON public.store_collection_products FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_collections c
      JOIN public.store_settings s ON s.tenant_id = c.tenant_id
      WHERE c.id = store_collection_products.collection_id AND c.is_active = true AND s.enabled = true
    )
    OR tenant_id = get_user_tenant_id(auth.uid())
    OR is_superadmin(auth.uid())
  );

CREATE POLICY "scp_insert"
  ON public.store_collection_products FOR INSERT
  TO authenticated
  WITH CHECK (is_tenant_manager_or_above(auth.uid()) AND (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid())));

CREATE POLICY "scp_delete"
  ON public.store_collection_products FOR DELETE
  TO authenticated
  USING (is_tenant_manager_or_above(auth.uid()) AND (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid())));

CREATE POLICY "scp_update"
  ON public.store_collection_products FOR UPDATE
  TO authenticated
  USING (is_tenant_manager_or_above(auth.uid()) AND (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid())));

CREATE TRIGGER trg_scp_set_tenant BEFORE INSERT ON public.store_collection_products
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

-- 6. Public read access to products & related lookup tables for storefront
-- products already restricts SELECT to tenant; add an additive policy for public access.
CREATE POLICY "products_public_storefront_read"
  ON public.products FOR SELECT
  TO anon, authenticated
  USING (
    show_on_website = true AND is_active = true AND EXISTS (
      SELECT 1 FROM public.store_settings s WHERE s.tenant_id = products.tenant_id AND s.enabled = true
    )
  );

CREATE POLICY "product_variations_public_storefront_read"
  ON public.product_variations FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true AND EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.store_settings s ON s.tenant_id = p.tenant_id
      WHERE p.id = product_variations.product_id AND p.show_on_website = true AND p.is_active = true AND s.enabled = true
    )
  );

CREATE POLICY "categories_public_storefront_read"
  ON public.categories FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true AND EXISTS (
      SELECT 1 FROM public.store_settings s WHERE s.tenant_id = categories.tenant_id AND s.enabled = true
    )
  );

CREATE POLICY "brands_public_storefront_read"
  ON public.brands FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true AND EXISTS (
      SELECT 1 FROM public.store_settings s WHERE s.tenant_id = brands.tenant_id AND s.enabled = true
    )
  );

CREATE POLICY "tenants_public_slug_read"
  ON public.tenants FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (SELECT 1 FROM public.store_settings s WHERE s.tenant_id = tenants.id AND s.enabled = true)
  );

CREATE POLICY "cms_pages_public_read"
  ON public.cms_pages FOR SELECT
  TO anon, authenticated
  USING (
    status = 'published' AND EXISTS (
      SELECT 1 FROM public.store_settings s WHERE s.tenant_id = cms_pages.tenant_id AND s.enabled = true
    )
  );

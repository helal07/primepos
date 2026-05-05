
-- 1. Plan/tenant module enablement
ALTER TABLE public.saas_packages ADD COLUMN IF NOT EXISTS enabled_modules text[] NOT NULL DEFAULT ARRAY['pos','sales','purchases','products','contacts','reports']::text[];
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS enabled_modules text[];

-- 2. Helper function
CREATE OR REPLACE FUNCTION public.tenant_has_module(_user_id uuid, _module text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_superadmin(_user_id) OR EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.tenants t ON t.id = p.tenant_id
    LEFT JOIN public.saas_packages pk ON pk.id = t.package_id
    WHERE p.user_id = _user_id
      AND (
        (t.enabled_modules IS NOT NULL AND _module = ANY(t.enabled_modules))
        OR (t.enabled_modules IS NULL AND pk.enabled_modules IS NOT NULL AND _module = ANY(pk.enabled_modules))
      )
  );
$$;

-- 3. Sales: tag exchange origin
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'regular';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS exchange_purchase_id uuid;

-- 4. Exchange purchases table
CREATE TABLE IF NOT EXISTS public.exchange_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  reference_no text NOT NULL DEFAULT ('EX-' || to_char(now(), 'YYMMDDHH24MISS')),
  purchase_date date NOT NULL DEFAULT CURRENT_DATE,
  -- Seller
  seller_name text NOT NULL,
  seller_phone text,
  seller_address text,
  seller_nid_no text,
  seller_nid_url text,
  seller_photo_url text,
  -- Device
  product_name text NOT NULL,
  brand text,
  model text,
  imei text,
  condition_notes text,
  goods_photos text[] NOT NULL DEFAULT ARRAY[]::text[],
  -- Pricing
  purchase_price numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  paid_amount numeric NOT NULL DEFAULT 0,
  -- State
  status text NOT NULL DEFAULT 'in_stock',
  linked_product_id uuid,
  linked_variation_id uuid,
  linked_sale_id uuid,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exchange_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exchange_select" ON public.exchange_purchases
  FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id(auth.uid())) OR is_superadmin(auth.uid()));

CREATE POLICY "exchange_insert" ON public.exchange_purchases
  FOR INSERT TO authenticated
  WITH CHECK (tenant_has_module(auth.uid(), 'exchange'));

CREATE POLICY "exchange_update" ON public.exchange_purchases
  FOR UPDATE TO authenticated
  USING (tenant_has_module(auth.uid(), 'exchange') AND ((tenant_id = get_user_tenant_id(auth.uid())) OR is_superadmin(auth.uid())));

CREATE POLICY "exchange_delete" ON public.exchange_purchases
  FOR DELETE TO authenticated
  USING (is_tenant_manager_or_above(auth.uid()) AND ((tenant_id = get_user_tenant_id(auth.uid())) OR is_superadmin(auth.uid())));

CREATE TRIGGER exchange_purchases_set_tenant
  BEFORE INSERT ON public.exchange_purchases
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER exchange_purchases_updated
  BEFORE UPDATE ON public.exchange_purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_exchange_purchases_tenant ON public.exchange_purchases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_exchange_purchases_imei ON public.exchange_purchases(imei);

-- 5. Storage bucket for exchange documents (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('exchange-docs', 'exchange-docs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "exchange_docs_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'exchange-docs' AND (storage.foldername(name))[1] = get_user_tenant_id(auth.uid())::text);

CREATE POLICY "exchange_docs_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'exchange-docs' AND (storage.foldername(name))[1] = get_user_tenant_id(auth.uid())::text);

CREATE POLICY "exchange_docs_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'exchange-docs' AND (storage.foldername(name))[1] = get_user_tenant_id(auth.uid())::text);

CREATE POLICY "exchange_docs_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'exchange-docs' AND (storage.foldername(name))[1] = get_user_tenant_id(auth.uid())::text);

-- Default existing packages to include exchange off; superadmin can toggle
UPDATE public.saas_packages SET enabled_modules = enabled_modules WHERE true;

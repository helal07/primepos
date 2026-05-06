
-- SMS Providers
CREATE TABLE public.sms_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  gateway_type text NOT NULL DEFAULT 'http',
  api_key text,
  api_secret text,
  sender_id text,
  base_url text,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
ALTER TABLE public.sms_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY sms_providers_all ON public.sms_providers FOR ALL TO authenticated USING (is_superadmin(auth.uid())) WITH CHECK (is_superadmin(auth.uid()));
CREATE TRIGGER sms_providers_updated BEFORE UPDATE ON public.sms_providers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SMS Plans
CREATE TABLE public.sms_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sms_count integer NOT NULL DEFAULT 0,
  price numeric NOT NULL DEFAULT 0,
  validity_days integer,
  is_active boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sms_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY sms_plans_select ON public.sms_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY sms_plans_write ON public.sms_plans FOR INSERT TO authenticated WITH CHECK (is_superadmin(auth.uid()));
CREATE POLICY sms_plans_update ON public.sms_plans FOR UPDATE TO authenticated USING (is_superadmin(auth.uid()));
CREATE POLICY sms_plans_delete ON public.sms_plans FOR DELETE TO authenticated USING (is_superadmin(auth.uid()));
CREATE TRIGGER sms_plans_updated BEFORE UPDATE ON public.sms_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SMS Purchases
CREATE TABLE public.sms_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  plan_id uuid REFERENCES public.sms_plans(id) ON DELETE SET NULL,
  sms_count integer NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  payment_method text,
  reference_no text,
  notes text,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sms_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY sms_purchases_select ON public.sms_purchases FOR SELECT TO authenticated USING ((tenant_id = get_user_tenant_id(auth.uid())) OR is_superadmin(auth.uid()));
CREATE POLICY sms_purchases_insert ON public.sms_purchases FOR INSERT TO authenticated WITH CHECK (is_superadmin(auth.uid()));
CREATE POLICY sms_purchases_update ON public.sms_purchases FOR UPDATE TO authenticated USING (is_superadmin(auth.uid()));
CREATE POLICY sms_purchases_delete ON public.sms_purchases FOR DELETE TO authenticated USING (is_superadmin(auth.uid()));

-- Sitemap Entries
CREATE TABLE public.sitemap_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL UNIQUE,
  priority numeric NOT NULL DEFAULT 0.5,
  changefreq text NOT NULL DEFAULT 'monthly',
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sitemap_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY sitemap_select ON public.sitemap_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY sitemap_write ON public.sitemap_entries FOR INSERT TO authenticated WITH CHECK (is_superadmin(auth.uid()));
CREATE POLICY sitemap_update ON public.sitemap_entries FOR UPDATE TO authenticated USING (is_superadmin(auth.uid()));
CREATE POLICY sitemap_delete ON public.sitemap_entries FOR DELETE TO authenticated USING (is_superadmin(auth.uid()));
CREATE TRIGGER sitemap_updated BEFORE UPDATE ON public.sitemap_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

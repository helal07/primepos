
-- 1. saas_packages
CREATE TABLE public.saas_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  duration_days integer NOT NULL DEFAULT 30,
  max_users integer NOT NULL DEFAULT 1,
  max_business_location integer NOT NULL DEFAULT 1,
  max_invoice integer NOT NULL DEFAULT 0,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_popular boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.saas_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active packages" ON public.saas_packages
  FOR SELECT USING (true);

CREATE POLICY "Superadmins can insert packages" ON public.saas_packages
  FOR INSERT TO authenticated WITH CHECK (is_superadmin(auth.uid()));

CREATE POLICY "Superadmins can update packages" ON public.saas_packages
  FOR UPDATE TO authenticated USING (is_superadmin(auth.uid()));

CREATE POLICY "Superadmins can delete packages" ON public.saas_packages
  FOR DELETE TO authenticated USING (is_superadmin(auth.uid()));

CREATE TRIGGER update_saas_packages_updated_at
  BEFORE UPDATE ON public.saas_packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. tenants
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  address text,
  owner_user_id uuid NOT NULL,
  package_id uuid REFERENCES public.saas_packages(id) ON DELETE SET NULL,
  subscription_start date NOT NULL DEFAULT CURRENT_DATE,
  subscription_end date,
  status text NOT NULL DEFAULT 'trial',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can view tenants" ON public.tenants
  FOR SELECT TO authenticated USING (is_superadmin(auth.uid()));

CREATE POLICY "Superadmins can insert tenants" ON public.tenants
  FOR INSERT TO authenticated WITH CHECK (is_superadmin(auth.uid()));

CREATE POLICY "Superadmins can update tenants" ON public.tenants
  FOR UPDATE TO authenticated USING (is_superadmin(auth.uid()));

CREATE POLICY "Superadmins can delete tenants" ON public.tenants
  FOR DELETE TO authenticated USING (is_superadmin(auth.uid()));

CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. tenant_actions_log
CREATE TABLE public.tenant_actions_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  performed_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_actions_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can view action logs" ON public.tenant_actions_log
  FOR SELECT TO authenticated USING (is_superadmin(auth.uid()));

CREATE POLICY "Superadmins can insert action logs" ON public.tenant_actions_log
  FOR INSERT TO authenticated WITH CHECK (is_superadmin(auth.uid()));

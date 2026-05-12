
-- Payment gateways (public meta)
CREATE TABLE IF NOT EXISTS public.payment_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL UNIQUE,
  display_name text NOT NULL,
  mode text NOT NULL DEFAULT 'sandbox',
  active boolean NOT NULL DEFAULT false,
  visible boolean NOT NULL DEFAULT true,
  account_number text,
  account_type text,
  instructions text,
  logo_url text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pg_super_all" ON public.payment_gateways
  FOR ALL TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));
CREATE POLICY "pg_public_read_active" ON public.payment_gateways
  FOR SELECT TO public USING (active = true AND visible = true);
CREATE TRIGGER pg_set_updated_at BEFORE UPDATE ON public.payment_gateways
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Private credentials
CREATE TABLE IF NOT EXISTS public.payment_gateway_credentials (
  gateway_id uuid PRIMARY KEY REFERENCES public.payment_gateways(id) ON DELETE CASCADE,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_gateway_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pgc_super_all" ON public.payment_gateway_credentials
  FOR ALL TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));
CREATE TRIGGER pgc_set_updated_at BEFORE UPDATE ON public.payment_gateway_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Payment attempts log (gateway initiated)
CREATE TABLE IF NOT EXISTS public.payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  package_id uuid REFERENCES public.saas_packages(id) ON DELETE SET NULL,
  gateway text NOT NULL,
  gateway_ref text,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BDT',
  status text NOT NULL DEFAULT 'initiated',
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_tenant ON public.payment_attempts(tenant_id);
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pa_super_all" ON public.payment_attempts
  FOR ALL TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));
CREATE POLICY "pa_tenant_view" ON public.payment_attempts
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE TRIGGER pa_set_updated_at BEFORE UPDATE ON public.payment_attempts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tenant payments (manual + auto-recorded after gateway success)
CREATE TABLE IF NOT EXISTS public.tenant_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  package_id uuid REFERENCES public.saas_packages(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BDT',
  payment_method text NOT NULL DEFAULT 'offline',
  payment_reference text,
  payer_name text,
  payer_phone text,
  proof_url text,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  starts_on date,
  ends_on date,
  approved_at timestamptz,
  approved_by uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tenant_payments_tenant ON public.tenant_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_payments_status ON public.tenant_payments(status);
ALTER TABLE public.tenant_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tp_super_all" ON public.tenant_payments
  FOR ALL TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));
CREATE POLICY "tp_tenant_view" ON public.tenant_payments
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "tp_tenant_insert" ON public.tenant_payments
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE TRIGGER tp_set_updated_at BEFORE UPDATE ON public.tenant_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Activation function (extends subscription, sets status=active)
CREATE OR REPLACE FUNCTION public.activate_tenant_after_payment(
  _tenant_id uuid,
  _amount numeric,
  _gateway text,
  _gateway_ref text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pkg public.saas_packages;
  v_base date;
  v_new_end date;
BEGIN
  SELECT * INTO v_pkg
    FROM public.saas_packages
   WHERE is_active = true AND price = _amount
   ORDER BY duration_days ASC
   LIMIT 1;

  IF v_pkg.id IS NULL THEN
    SELECT sp.* INTO v_pkg
      FROM public.tenants t
      JOIN public.saas_packages sp ON sp.id = t.package_id
     WHERE t.id = _tenant_id;
  END IF;

  IF v_pkg.duration_days IS NULL THEN
    v_pkg.duration_days := 30;
  END IF;

  SELECT GREATEST(COALESCE(subscription_end, CURRENT_DATE), CURRENT_DATE)
    INTO v_base FROM public.tenants WHERE id = _tenant_id;

  v_new_end := v_base + (v_pkg.duration_days || ' days')::interval;

  UPDATE public.tenants
     SET status = 'active',
         subscription_end = v_new_end,
         package_id = COALESCE(v_pkg.id, package_id),
         updated_at = now()
   WHERE id = _tenant_id;

  INSERT INTO public.tenant_payments (
    tenant_id, package_id, amount, currency, payment_method, payment_reference,
    status, starts_on, ends_on, approved_at
  ) VALUES (
    _tenant_id, v_pkg.id, _amount, 'BDT', _gateway, _gateway_ref,
    'active', CURRENT_DATE, v_new_end, now()
  );

  RETURN jsonb_build_object(
    'tenant_id', _tenant_id,
    'new_end', v_new_end,
    'package_id', v_pkg.id,
    'duration_days', v_pkg.duration_days
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.activate_tenant_after_payment(uuid, numeric, text, text) FROM anon, authenticated, PUBLIC;

-- Seed bKash and EPS gateway rows
INSERT INTO public.payment_gateways (provider, display_name, mode, active, visible, sort_order)
VALUES ('bkash', 'bKash', 'sandbox', false, true, 10),
       ('eps',   'EPS',   'sandbox', false, true, 20)
ON CONFLICT (provider) DO NOTHING;

INSERT INTO public.payment_gateway_credentials (gateway_id, config)
SELECT id, '{}'::jsonb FROM public.payment_gateways
WHERE provider IN ('bkash','eps')
ON CONFLICT (gateway_id) DO NOTHING;


CREATE TABLE public.business_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_select" ON public.business_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings_insert" ON public.business_settings FOR INSERT TO authenticated WITH CHECK (public.is_tenant_manager_or_above(auth.uid()));
CREATE POLICY "settings_update" ON public.business_settings FOR UPDATE TO authenticated USING (public.is_tenant_manager_or_above(auth.uid()));
CREATE POLICY "settings_delete" ON public.business_settings FOR DELETE TO authenticated USING (public.is_superadmin(auth.uid()));

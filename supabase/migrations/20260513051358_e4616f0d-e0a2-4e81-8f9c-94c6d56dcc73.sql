
-- FAQ entries managed from Landing CMS
CREATE TABLE IF NOT EXISTS public.faq_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.faq_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "faq_public_read" ON public.faq_entries
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "faq_super_all" ON public.faq_entries
  FOR ALL TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

CREATE TRIGGER faq_entries_updated_at
  BEFORE UPDATE ON public.faq_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_faq_entries_sort ON public.faq_entries(sort_order);

-- Allow anon to read landing CMS keys (cms_*) so SEO + section copy renders for guests
CREATE POLICY "settings_public_cms_read" ON public.business_settings
  FOR SELECT TO anon, authenticated
  USING (key LIKE 'cms\_%' ESCAPE '\');

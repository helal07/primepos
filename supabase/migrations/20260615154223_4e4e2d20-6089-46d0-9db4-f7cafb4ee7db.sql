CREATE TABLE IF NOT EXISTS public.faq_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.faq_entries TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.faq_entries TO authenticated;
GRANT ALL ON public.faq_entries TO service_role;

ALTER TABLE public.faq_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "faq_public_read" ON public.faq_entries
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "faq_super_all" ON public.faq_entries
  FOR ALL TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

CREATE OR REPLACE FUNCTION public.faq_entries_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_faq_entries_updated_at
  BEFORE UPDATE ON public.faq_entries
  FOR EACH ROW EXECUTE FUNCTION public.faq_entries_set_updated_at();
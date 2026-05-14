
-- Landing features (global, superadmin-managed)
CREATE TABLE public.landing_features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  icon TEXT NOT NULL DEFAULT 'Sparkles',
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.landing_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active landing features"
  ON public.landing_features FOR SELECT
  USING (is_active = true OR public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmin manages landing features"
  ON public.landing_features FOR ALL
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

CREATE TRIGGER update_landing_features_updated_at
  BEFORE UPDATE ON public.landing_features
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Landing reviews (testimonials)
CREATE TABLE public.landing_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,
  rating INTEGER NOT NULL DEFAULT 5,
  text TEXT NOT NULL,
  avatar_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.landing_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active landing reviews"
  ON public.landing_reviews FOR SELECT
  USING (is_active = true OR public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmin manages landing reviews"
  ON public.landing_reviews FOR ALL
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

CREATE TRIGGER update_landing_reviews_updated_at
  BEFORE UPDATE ON public.landing_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Packages: show_on_landing flag
ALTER TABLE public.saas_packages
  ADD COLUMN IF NOT EXISTS show_on_landing BOOLEAN NOT NULL DEFAULT true;

-- Tighten business_settings: ensure global (tenant_id IS NULL) cms_* rows are public-read, superadmin-write.
-- Drop overly permissive existing policies if present, then recreate.
DO $$
BEGIN
  -- Public read for global CMS keys
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='business_settings'
      AND policyname='Public can read global cms settings'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "Public can read global cms settings"
        ON public.business_settings FOR SELECT
        USING (
          tenant_id IS NULL
          AND (key LIKE 'cms_%' OR key IN ('faq_entries'))
        )
    $p$;
  END IF;

  -- Superadmin write for global rows
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='business_settings'
      AND policyname='Superadmin manages global settings'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "Superadmin manages global settings"
        ON public.business_settings FOR ALL
        USING (tenant_id IS NULL AND public.is_superadmin(auth.uid()))
        WITH CHECK (tenant_id IS NULL AND public.is_superadmin(auth.uid()))
    $p$;
  END IF;
END $$;

-- Public read for cms_pages (published only) and faq_entries (active only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cms_pages'
      AND policyname='Public can view published cms pages'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "Public can view published cms pages"
        ON public.cms_pages FOR SELECT
        USING (status = 'published' OR public.is_superadmin(auth.uid()))
    $p$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cms_pages'
      AND policyname='Superadmin manages cms pages'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "Superadmin manages cms pages"
        ON public.cms_pages FOR ALL
        USING (public.is_superadmin(auth.uid()))
        WITH CHECK (public.is_superadmin(auth.uid()))
    $p$;
  END IF;
END $$;

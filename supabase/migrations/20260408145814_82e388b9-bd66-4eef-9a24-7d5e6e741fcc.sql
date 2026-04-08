
CREATE TABLE public.warranty_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  claim_date DATE NOT NULL DEFAULT CURRENT_DATE,
  issue_description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  resolution TEXT,
  resolved_date DATE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.warranty_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wc_select" ON public.warranty_claims FOR SELECT TO authenticated USING (true);
CREATE POLICY "wc_insert" ON public.warranty_claims FOR INSERT TO authenticated WITH CHECK (public.has_module_permission(auth.uid(), 'warranty', 'can_create'));
CREATE POLICY "wc_update" ON public.warranty_claims FOR UPDATE TO authenticated USING (public.has_module_permission(auth.uid(), 'warranty', 'can_edit'));
CREATE POLICY "wc_delete" ON public.warranty_claims FOR DELETE TO authenticated USING (public.has_module_permission(auth.uid(), 'warranty', 'can_delete'));

CREATE TABLE public.cms_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  meta_title TEXT,
  meta_description TEXT,
  featured_image TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cms_pages_select" ON public.cms_pages FOR SELECT TO authenticated USING (true);
CREATE POLICY "cms_pages_insert" ON public.cms_pages FOR INSERT TO authenticated WITH CHECK (public.has_module_permission(auth.uid(), 'cms', 'can_create'));
CREATE POLICY "cms_pages_update" ON public.cms_pages FOR UPDATE TO authenticated USING (public.has_module_permission(auth.uid(), 'cms', 'can_edit'));
CREATE POLICY "cms_pages_delete" ON public.cms_pages FOR DELETE TO authenticated USING (public.has_module_permission(auth.uid(), 'cms', 'can_delete'));

CREATE TABLE public.cms_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT DEFAULT 0,
  alt_text TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cms_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cms_media_select" ON public.cms_media FOR SELECT TO authenticated USING (true);
CREATE POLICY "cms_media_insert" ON public.cms_media FOR INSERT TO authenticated WITH CHECK (public.has_module_permission(auth.uid(), 'cms', 'can_create'));
CREATE POLICY "cms_media_delete" ON public.cms_media FOR DELETE TO authenticated USING (public.has_module_permission(auth.uid(), 'cms', 'can_delete'));


-- Phase 5: Engagement features

-- Blog posts
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  slug text NOT NULL,
  title text NOT NULL,
  excerpt text,
  cover_url text,
  content text,
  author_name text,
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_blog_posts_tenant ON public.blog_posts(tenant_id);
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blog_public_read" ON public.blog_posts FOR SELECT TO anon, authenticated
  USING (is_published = true AND EXISTS (
    SELECT 1 FROM public.store_settings s WHERE s.tenant_id = blog_posts.tenant_id AND s.enabled = true
  ));
CREATE POLICY "blog_tenant_read" ON public.blog_posts FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));
CREATE POLICY "blog_tenant_write" ON public.blog_posts FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));
CREATE POLICY "blog_tenant_update" ON public.blog_posts FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));
CREATE POLICY "blog_tenant_delete" ON public.blog_posts FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

CREATE TRIGGER trg_blog_set_tenant BEFORE INSERT ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE TRIGGER trg_blog_updated_at BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Newsletter subscribers
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  email text NOT NULL,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, email)
);
CREATE INDEX IF NOT EXISTS idx_news_tenant ON public.newsletter_subscribers(tenant_id);
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "news_public_insert" ON public.newsletter_subscribers FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.store_settings s WHERE s.tenant_id = newsletter_subscribers.tenant_id AND s.enabled = true));
CREATE POLICY "news_tenant_read" ON public.newsletter_subscribers FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));
CREATE POLICY "news_tenant_delete" ON public.newsletter_subscribers FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

-- Wishlist (guest-friendly via session_token)
CREATE TABLE IF NOT EXISTS public.wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  session_token text NOT NULL,
  user_id uuid,
  product_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, session_token, product_id)
);
CREATE INDEX IF NOT EXISTS idx_wish_tenant_session ON public.wishlist_items(tenant_id, session_token);
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wish_public_select" ON public.wishlist_items FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY "wish_public_insert" ON public.wishlist_items FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.store_settings s WHERE s.tenant_id = wishlist_items.tenant_id AND s.enabled = true));
CREATE POLICY "wish_public_delete" ON public.wishlist_items FOR DELETE TO anon, authenticated
  USING (true);

-- Store layout sections (drag and drop ordering)
CREATE TABLE IF NOT EXISTS public.store_layout_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  section_key text NOT NULL,
  title text,
  is_visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, section_key)
);
CREATE INDEX IF NOT EXISTS idx_layout_tenant ON public.store_layout_sections(tenant_id);
ALTER TABLE public.store_layout_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "layout_public_read" ON public.store_layout_sections FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY "layout_tenant_write" ON public.store_layout_sections FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));
CREATE POLICY "layout_tenant_update" ON public.store_layout_sections FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));
CREATE POLICY "layout_tenant_delete" ON public.store_layout_sections FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

CREATE TRIGGER trg_layout_set_tenant BEFORE INSERT ON public.store_layout_sections
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE TRIGGER trg_layout_updated_at BEFORE UPDATE ON public.store_layout_sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

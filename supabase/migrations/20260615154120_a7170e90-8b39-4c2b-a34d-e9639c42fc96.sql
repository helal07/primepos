-- Remove tenant CMS + storefront/website-builder feature.
-- Superadmin SaaS landing CMS (landing_features, landing_reviews, sitemap_entries) is intentionally NOT touched.

DROP FUNCTION IF EXISTS public.place_store_order(uuid, jsonb, text, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.place_store_order CASCADE;
DROP FUNCTION IF EXISTS public.confirm_store_order(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.confirm_store_order CASCADE;
DROP FUNCTION IF EXISTS public.cancel_store_order(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.cancel_store_order CASCADE;
DROP FUNCTION IF EXISTS public.generate_store_order_number(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.generate_store_order_number CASCADE;

DROP TABLE IF EXISTS public.store_order_items         CASCADE;
DROP TABLE IF EXISTS public.store_orders              CASCADE;
DROP TABLE IF EXISTS public.wishlist_items            CASCADE;
DROP TABLE IF EXISTS public.store_collection_products CASCADE;
DROP TABLE IF EXISTS public.store_collections         CASCADE;
DROP TABLE IF EXISTS public.store_layout_sections     CASCADE;
DROP TABLE IF EXISTS public.store_settings            CASCADE;
DROP TABLE IF EXISTS public.newsletter_subscribers    CASCADE;
DROP TABLE IF EXISTS public.cms_media                 CASCADE;
DROP TABLE IF EXISTS public.cms_pages                 CASCADE;
DROP TABLE IF EXISTS public.blog_posts                CASCADE;
DROP TABLE IF EXISTS public.faq_entries               CASCADE;
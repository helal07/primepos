import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StoreSettings {
  id: string;
  tenant_id: string;
  enabled: boolean;
  theme: string;
  store_name: string | null;
  tagline: string | null;
  logo_url: string | null;
  banner_url: string | null;
  primary_color: string | null;
  currency: string;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  whatsapp_number: string | null;
  meta_title: string | null;
  meta_description: string | null;
  hero_heading: string | null;
  hero_subheading: string | null;
  hero_cta_label: string | null;
  hero_cta_url: string | null;
  about_html: string | null;
  footer_html: string | null;
  enable_cod: boolean;
  enable_sslcommerz: boolean;
  enable_bkash: boolean;
  shipping_flat_rate: number;
  free_shipping_threshold: number | null;
}

export function useTenantBySlug(slug?: string) {
  return useQuery({
    queryKey: ["store_tenant", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, slug")
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useStoreSettings(tenantId?: string) {
  return useQuery({
    queryKey: ["store_settings", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_settings")
        .select("*")
        .eq("tenant_id", tenantId!)
        .maybeSingle();
      if (error) throw error;
      return data as StoreSettings | null;
    },
  });
}

export function useStoreProducts(tenantId?: string, opts?: { search?: string; categoryId?: string; brandId?: string; limit?: number }) {
  return useQuery({
    queryKey: ["store_products", tenantId, opts],
    enabled: !!tenantId,
    queryFn: async () => {
      let q = supabase
        .from("products")
        .select("id, name, sku, website_slug, website_description, description, image_url, gallery_urls, selling_price, stock_quantity, category_id, brand_id")
        .eq("tenant_id", tenantId!)
        .eq("show_on_website", true)
        .eq("is_active", true)
        .order("name");
      if (opts?.search) q = q.ilike("name", `%${opts.search}%`);
      if (opts?.categoryId) q = q.eq("category_id", opts.categoryId);
      if (opts?.brandId) q = q.eq("brand_id", opts.brandId);
      if (opts?.limit) q = q.limit(opts.limit);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useStoreProduct(tenantId?: string, slugOrId?: string) {
  return useQuery({
    queryKey: ["store_product", tenantId, slugOrId],
    enabled: !!tenantId && !!slugOrId,
    queryFn: async () => {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(slugOrId!);
      let q = supabase
        .from("products")
        .select("*, product_variations(*)")
        .eq("tenant_id", tenantId!)
        .eq("show_on_website", true)
        .eq("is_active", true);
      q = isUuid ? q.eq("id", slugOrId!) : q.eq("website_slug", slugOrId!);
      const { data, error } = await q.maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useStoreCollections(tenantId?: string) {
  return useQuery({
    queryKey: ["store_collections", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_collections")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCollectionProducts(tenantId?: string, collectionSlug?: string) {
  return useQuery({
    queryKey: ["store_collection_products", tenantId, collectionSlug],
    enabled: !!tenantId && !!collectionSlug,
    queryFn: async () => {
      const { data: col } = await supabase
        .from("store_collections")
        .select("id, name, description, image_url")
        .eq("tenant_id", tenantId!)
        .eq("slug", collectionSlug!)
        .maybeSingle();
      if (!col) return { collection: null, products: [] };
      const { data: links } = await supabase
        .from("store_collection_products")
        .select("product_id, sort_order, products!inner(id, name, website_slug, image_url, selling_price, stock_quantity, show_on_website, is_active)")
        .eq("collection_id", col.id)
        .order("sort_order");
      const products = (links ?? [])
        .map((l: any) => l.products)
        .filter((p: any) => p && p.show_on_website && p.is_active);
      return { collection: col, products };
    },
  });
}

export function useStoreCategories(tenantId?: string) {
  return useQuery({
    queryKey: ["store_categories", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name")
        .eq("tenant_id", tenantId!)
        .eq("is_active", true)
        .order("name");
      return data ?? [];
    },
  });
}

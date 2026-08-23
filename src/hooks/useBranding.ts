import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";

/** Public (unauthenticated) read of a global CMS setting managed by the superadmin. */
export function useGlobalSetting<T = any>(key: string) {
  return useQuery({
    queryKey: ["business_settings", key, "global"],
    queryFn: async () => {
      try {
        const res = await api.get<{ value: any }>(`/api/public/landing/cms/${encodeURIComponent(key)}`);
        return (res?.value ?? null) as T | null;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

export interface Branding {
  brand_name?: string;
  brand_short?: string;
  logo_url?: string;
  favicon_url?: string;
  apple_touch_url?: string;
  theme_color?: string;
  og_default_image?: string;
}

/** Superadmin-managed branding (logo, brand name) used across auth screens. */
export function useBranding() {
  const { data } = useGlobalSetting<Branding>("cms_branding");
  const brandName = data?.brand_name || "Prime POS";
  return {
    branding: data ?? null,
    brandName,
    brandShort: data?.brand_short || brandName.charAt(0),
    logoUrl: normalizeStorageUrl(data?.logo_url) || undefined,
  };
}

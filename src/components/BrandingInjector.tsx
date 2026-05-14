import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Reads global cms_branding (tenant_id IS NULL) and applies favicon,
 * theme color, and document title to <head> at runtime. Sitewide.
 */
export function BrandingInjector() {
  const { data: branding } = useQuery({
    queryKey: ["business_settings", "cms_branding"],
    queryFn: async () => {
      const { data } = await supabase
        .from("business_settings")
        .select("value")
        .eq("key", "cms_branding")
        .is("tenant_id", null)
        .maybeSingle();
      return (data?.value as Record<string, string>) ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!branding) return;

    if (branding.favicon_url) {
      let icon = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!icon) { icon = document.createElement("link"); icon.rel = "icon"; document.head.appendChild(icon); }
      icon.href = branding.favicon_url;
    }
    if (branding.apple_touch_url) {
      let apple = document.head.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
      if (!apple) { apple = document.createElement("link"); apple.rel = "apple-touch-icon"; document.head.appendChild(apple); }
      apple.href = branding.apple_touch_url;
    }
    if (branding.theme_color) {
      let theme = document.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      if (!theme) { theme = document.createElement("meta"); theme.name = "theme-color"; document.head.appendChild(theme); }
      theme.content = branding.theme_color;
    }
  }, [branding]);

  return null;
}
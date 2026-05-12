import { useEffect } from "react";
import { useSettings } from "@/hooks/useSettings";

/**
 * Replaces the static /manifest.webmanifest with a tenant-specific manifest
 * built from the `pwa` business setting (name + icon_url).
 */
export function DynamicManifest() {
  const { data: settings } = useSettings();
  const pwa = settings?.pwa;

  useEffect(() => {
    if (!pwa) return;
    const name = (pwa.name || "Prime POS").toString().slice(0, 60);
    const shortName = (pwa.short_name || name).toString().slice(0, 30);
    const themeColor = pwa.theme_color || "#0369a1";
    const icon = pwa.icon_url || "/icon-512.png";

    const manifest = {
      name,
      short_name: shortName,
      description: pwa.description || "POS, Inventory, Accounts & ERP",
      start_url: "/dashboard",
      scope: "/",
      display: "standalone",
      orientation: "portrait",
      background_color: pwa.background_color || "#0f172a",
      theme_color: themeColor,
      icons: [
        { src: icon, sizes: "192x192", type: "image/png", purpose: "any maskable" },
        { src: icon, sizes: "512x512", type: "image/png", purpose: "any maskable" },
      ],
    };

    const blob = new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" });
    const url = URL.createObjectURL(blob);

    let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "manifest";
      document.head.appendChild(link);
    }
    const prev = link.href;
    link.href = url;

    // Theme color
    let theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!theme) {
      theme = document.createElement("meta");
      theme.name = "theme-color";
      document.head.appendChild(theme);
    }
    theme.content = themeColor;

    // Apple icon + title
    if (pwa.icon_url) {
      let apple = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
      if (!apple) {
        apple = document.createElement("link");
        apple.rel = "apple-touch-icon";
        document.head.appendChild(apple);
      }
      apple.href = pwa.icon_url;
    }
    let appleTitle = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]');
    if (!appleTitle) {
      appleTitle = document.createElement("meta");
      appleTitle.name = "apple-mobile-web-app-title";
      document.head.appendChild(appleTitle);
    }
    appleTitle.content = shortName;

    document.title = name;

    return () => {
      URL.revokeObjectURL(url);
      if (link && prev) link.href = prev;
    };
  }, [pwa]);

  return null;
}
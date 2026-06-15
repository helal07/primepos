import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useLandingCms } from "@/hooks/useSaasAdmin";
import { trackEvent } from "@/lib/tracking";

const PIXEL_PROXY_URL = `/api/fb-pixel-proxy`;

/**
 * Reads global cms_tracking (tenant_id IS NULL) and injects
 * GTM + GA4 + Meta Pixel sitewide. Fires page_view / PageView on every
 * SPA route change. Pixel script is loaded via a first-party proxy so
 * ad blockers that block connect.facebook.net are bypassed.
 */
export function TrackingInjector() {
  const location = useLocation();
  const initialized = useRef(false);

  const { data: trackingRaw } = useLandingCms("cms_tracking");
  const tracking = (trackingRaw as Record<string, string> | null) ?? null;

  useEffect(() => {
    if (!tracking) return;

    // Google Tag Manager
    const gtmId = tracking.gtm_id?.trim();
    if (gtmId && !document.getElementById("gtm-script")) {
      const s = document.createElement("script");
      s.id = "gtm-script";
      s.innerHTML = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`;
      document.head.appendChild(s);

      const noscript = document.createElement("noscript");
      noscript.id = "gtm-noscript";
      noscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
      document.body.insertBefore(noscript, document.body.firstChild);
    }

    // Google Analytics 4 (gtag.js)
    const ga4 = tracking.ga4_id?.trim();
    if (ga4 && !document.getElementById("ga4-script")) {
      const s1 = document.createElement("script");
      s1.id = "ga4-script";
      s1.async = true;
      s1.src = `https://www.googletagmanager.com/gtag/js?id=${ga4}`;
      document.head.appendChild(s1);
      const s2 = document.createElement("script");
      s2.innerHTML = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4}');`;
      document.head.appendChild(s2);
    }

    // Meta (Facebook) Pixel — loaded via first-party proxy
    const pixelId = tracking.fb_pixel_id?.trim();
    if (pixelId && !(window as any).fbq) {
      const s = document.createElement("script");
      s.id = "fb-pixel-script";
      s.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','${PIXEL_PROXY_URL}');fbq('init','${pixelId}');`;
      document.head.appendChild(s);

      const noscript = document.createElement("noscript");
      noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"/>`;
      document.body.appendChild(noscript);
    }

    initialized.current = true;
  }, [tracking]);

  // Fire PageView on every SPA route change (client pixel + server CAPI dedupe)
  useEffect(() => {
    if (!tracking) return;
    const url = window.location.href;
    const path = location.pathname + location.search;

    if ((window as any).fbq) (window as any).fbq("track", "PageView", {}, { eventID: `pv-${Date.now()}` });
    if ((window as any).gtag && tracking.ga4_id) {
      (window as any).gtag("event", "page_view", { page_location: url, page_path: path });
    }
    if ((window as any).dataLayer) {
      (window as any).dataLayer.push({ event: "page_view", page_location: url, page_path: path });
    }
    // Server-side mirror
    trackEvent("PageView", { event_source_url: url });
  }, [location.pathname, location.search, tracking]);

  return null;
}

/**
 * Server-side tracking helper. Sends events to the track-event edge function,
 * which fans out to Meta CAPI + GA4 Measurement Protocol.
 * Use alongside client-side fbq/gtag (with matching event_id) for dedupe.
 */
import { supabase } from "@/integrations/supabase/client";

function readCookie(name: string): string | undefined {
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : undefined;
}

function getGa4ClientId(measurementId?: string): string | undefined {
  // gtag stores client id as `_ga` cookie (GA1.1.<random>.<ts>)
  const ga = readCookie("_ga");
  if (ga) {
    const parts = ga.split(".");
    if (parts.length >= 4) return `${parts[2]}.${parts[3]}`;
  }
  if (!measurementId) return undefined;
  // Stream-specific cookie: _ga_<MEASUREMENT_ID without G->
  const stream = measurementId.replace(/^G-/, "");
  const c = readCookie(`_ga_${stream}`);
  return c?.split(".")[2];
}

export interface TrackUserData {
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  external_id?: string;
}

export interface TrackOptions {
  event_id?: string;
  event_source_url?: string;
  user_data?: TrackUserData;
  custom_data?: Record<string, unknown>;
}

export async function trackEvent(
  eventName: string,
  opts: TrackOptions = {},
): Promise<void> {
  try {
    const url = opts.event_source_url ?? (typeof window !== "undefined" ? window.location.href : undefined);
    const fbp = readCookie("_fbp");
    const fbc = readCookie("_fbc");
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : undefined;

    // Try to read GA4 measurement id from the loaded gtag script
    let ga4Id: string | undefined;
    const ga4Script = document.getElementById("ga4-script") as HTMLScriptElement | null;
    if (ga4Script?.src) {
      const m = ga4Script.src.match(/id=([^&]+)/);
      ga4Id = m?.[1];
    }
    const ga4ClientId = getGa4ClientId(ga4Id);

    await supabase.functions.invoke("track-event", {
      body: {
        event_name: eventName,
        event_id: opts.event_id ?? `${eventName.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        event_source_url: url,
        user_data: {
          ...(opts.user_data ?? {}),
          fbp,
          fbc,
          client_user_agent: ua,
        },
        custom_data: opts.custom_data,
        ga4_client_id: ga4ClientId,
      },
    });
  } catch {
    // Tracking must never break the app
  }
}
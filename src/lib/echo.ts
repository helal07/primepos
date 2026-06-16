/**
 * Laravel Echo client wired to a Reverb websocket server.
 *
 * Lazy singleton: the first call to `getEcho()` constructs the client; later
 * calls return the same instance. Returns `null` (and stays null) when the
 * required `VITE_REVERB_*` env vars are missing so the SPA degrades gracefully
 * to the 30s polling fallback in `NotificationBell`.
 */
import Echo from "laravel-echo";
import Pusher from "pusher-js";
import { API_URL } from "@/lib/apiClient";

let echo: Echo<"reverb"> | null = null;
let attempted = false;

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : undefined;
}

export function getEcho(): Echo<"reverb"> | null {
  if (echo || attempted) return echo;
  attempted = true;

  const key = import.meta.env.VITE_REVERB_APP_KEY as string | undefined;
  const host = import.meta.env.VITE_REVERB_HOST as string | undefined;
  if (!key || !host) return null;

  const port = Number(import.meta.env.VITE_REVERB_PORT ?? 443);
  const scheme = (import.meta.env.VITE_REVERB_SCHEME as string | undefined) ?? "https";

  // pusher-js is what Echo's "reverb" broadcaster uses on the wire.
  (window as unknown as { Pusher: typeof Pusher }).Pusher = Pusher;

  try {
    echo = new Echo({
      broadcaster: "reverb",
      key,
      wsHost: host,
      wsPort: port,
      wssPort: port,
      forceTLS: scheme === "https",
      enabledTransports: ["ws", "wss"],
      authEndpoint: `${API_URL}/broadcasting/auth`,
      // Custom authorizer so the Sanctum session cookie + XSRF token are
      // included on the cross-origin auth XHR (the default axios authorizer
      // doesn't set credentials: include).
      authorizer: (channel: { name: string }) => ({
        authorize: async (
          socketId: string,
          callback: (err: Error | null, data: unknown) => void,
        ) => {
          try {
            const res = await fetch(`${API_URL}/broadcasting/auth`, {
              method: "POST",
              credentials: "include",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "X-Requested-With": "XMLHttpRequest",
                "X-XSRF-TOKEN": readCookie("XSRF-TOKEN") ?? "",
              },
              body: new URLSearchParams({
                socket_id: socketId,
                channel_name: channel.name,
              }),
            });
            if (!res.ok) throw new Error(`broadcast-auth ${res.status}`);
            callback(null, await res.json());
          } catch (err) {
            callback(err as Error, null);
          }
        },
      }),
    });
  } catch (err) {
    console.warn("[echo] init failed", err);
    echo = null;
  }
  return echo;
}

export function leaveEcho(channel: string): void {
  echo?.leave(channel);
}
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { getEcho } from "@/lib/echo";

interface SuperadminPayload {
  resource: string;
  action: string;
  id?: string | null;
}

/**
 * Superadmin-only subscription to the `private(superadmin)` Reverb channel.
 * Invalidates the supplied React-Query keys whenever the backend broadcasts
 * `.superadmin.event` for one of the watched resource slugs.
 *
 * No-ops when Reverb isn't configured or the current user is not a
 * superadmin — non-super users would be rejected by channel auth anyway.
 */
export function useSuperadminRealtime(
  resources: string[],
  queryKeys: (string | unknown[])[],
) {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user || !user.roles?.includes("superadmin")) return;
    const echo = getEcho();
    if (!echo) return;

    const channel = echo.private("superadmin");
    const wanted = new Set(resources);

    const handler = (payload: SuperadminPayload) => {
      if (!wanted.has(payload.resource)) return;
      queryKeys.forEach((key) => {
        qc.invalidateQueries({
          queryKey: Array.isArray(key) ? key : [key],
        });
      });
    };

    channel.listen(".superadmin.event", handler);
    return () => {
      channel.stopListening(".superadmin.event");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, (user?.roles ?? []).join(","), resources.join(","), queryKeys.map((k) => (Array.isArray(k) ? k.join(":") : k)).join(",")]);
}
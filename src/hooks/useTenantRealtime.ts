import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { getEcho } from "@/lib/echo";

interface ChangePayload {
  resource: string;
  action: "created" | "updated" | "deleted";
  id?: string | null;
}

/**
 * Subscribe to the private tenant.{id} channel and invalidate React-Query
 * keys whenever the backend broadcasts `.tenant.resource.changed` for one
 * of the watched resources. No-ops when Reverb isn't configured or the
 * user has no tenant.
 *
 * @param resources resource slugs to watch (e.g. ["sales", "purchases"])
 * @param queryKeys query-key prefixes to invalidate on any matching event
 */
export function useTenantRealtime(resources: string[], queryKeys: (string | unknown[])[]) {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user?.tenant_id) return;
    const echo = getEcho();
    if (!echo) return;

    const channelName = `tenant.${user.tenant_id}`;
    const channel = echo.private(channelName);
    const wanted = new Set(resources);

    const handler = (payload: ChangePayload) => {
      if (!wanted.has(payload.resource)) return;
      queryKeys.forEach((key) => {
        qc.invalidateQueries({
          queryKey: Array.isArray(key) ? key : [key],
        });
      });
    };

    channel.listen(".tenant.resource.changed", handler);
    return () => {
      channel.stopListening(".tenant.resource.changed");
      // don't `leave` here — other subscribers may still need the channel
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.tenant_id, resources.join(","), queryKeys.map((k) => (Array.isArray(k) ? k.join(":") : k)).join(",")]);
}
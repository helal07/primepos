import { ReactNode } from "react";
import { useCan, useCanKey, PermAction } from "@/hooks/usePermission";

interface CanProps {
  /** Legacy 4-action API */
  module?: string;
  action?: PermAction;
  /** New granular Ultimate POS-style permission key, e.g. "sell.edit_price_on_pos" */
  perm?: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/** Conditionally render children only if the current user holds the given permission.
 *  Supports either legacy module/action or new granular `perm` key. */
export function Can({ module, action = "view", perm, children, fallback = null }: CanProps) {
  const legacy = useCan(module ?? "", action);
  const granular = useCanKey(perm ?? "");
  const isLoading = perm ? granular.isLoading : legacy.isLoading;
  const allowed = perm ? granular.allowed : legacy.allowed;
  if (isLoading) return null;
  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}

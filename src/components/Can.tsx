import { ReactNode } from "react";
import { useCan, PermAction } from "@/hooks/usePermission";

interface CanProps {
  module: string;
  action?: PermAction;
  children: ReactNode;
  fallback?: ReactNode;
}

/** Conditionally render children only if the current user has the given module/action permission. */
export function Can({ module, action = "view", children, fallback = null }: CanProps) {
  const { allowed, isLoading } = useCan(module, action);
  if (isLoading) return null;
  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}

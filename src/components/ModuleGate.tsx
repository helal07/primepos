import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useHasModule } from "@/hooks/useEnabledModules";
import type { ModuleKey } from "@/lib/modules";

interface Props {
  module: ModuleKey;
  children: ReactNode;
  redirectTo?: string;
}

export function ModuleGate({ module, children, redirectTo }: Props) {
  const { hasModule, isLoading } = useHasModule(module);
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }
  if (!hasModule) {
    if (redirectTo) return <Navigate to={redirectTo} replace />;
    return <Navigate to={`/locked/${module}`} replace />;
  }
  return <>{children}</>;
}
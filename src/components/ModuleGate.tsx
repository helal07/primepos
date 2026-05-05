import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useHasModule } from "@/hooks/useEnabledModules";
import type { ModuleKey } from "@/lib/modules";
import { Lock } from "lucide-react";

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
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <Lock className="h-10 w-10 text-muted-foreground mb-3" />
        <h2 className="text-xl font-semibold mb-1">Module not available</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          This feature is not included in your current plan. Contact your administrator to upgrade.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
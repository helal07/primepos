import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useCan, PermAction } from "@/hooks/usePermission";
import { ShieldAlert } from "lucide-react";

interface Props {
  module: string;
  action?: PermAction;
  children: ReactNode;
  fallback?: ReactNode;
  redirect?: boolean;
}

export function PermissionGate({ module, action = "view", children, fallback, redirect }: Props) {
  const { allowed, isLoading } = useCan(module, action);
  if (isLoading) {
    return <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">Checking access…</div>;
  }
  if (!allowed) {
    if (redirect) return <Navigate to="/" replace />;
    if (fallback !== undefined) return <>{fallback}</>;
    return (
      <div className="mx-auto max-w-md rounded-lg border border-dashed p-8 text-center">
        <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <h2 className="text-base font-semibold">Access denied</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          You don't have permission to {action} this section. Ask your administrator to grant it on your role.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}

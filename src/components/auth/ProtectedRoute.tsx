import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.is_superadmin) {
    return <Navigate to="/superadmin" replace />;
  }

  const tenant = user.tenant;
  const tenantMissing = !user.tenant_id || !tenant;
  const expired = !!tenant?.subscription_end &&
    new Date(tenant.subscription_end + "T23:59:59") < new Date();
  const suspended = tenant?.status === "suspended" || expired;

  if (tenantMissing || suspended) {
    const isSuspended = !tenantMissing && suspended;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full rounded-lg border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold mb-2">
            {isSuspended ? "Account Suspended" : "Account Unavailable"}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {isSuspended
              ? `Your account${tenant?.name ? ` (${tenant.name})` : ""} has been suspended. Please contact support to restore access.`
              : "Your account is no longer available. It may have been removed. Please contact support if you believe this is a mistake."}
          </p>
          <Button onClick={async () => { await signOut(); window.location.href = "/login"; }} className="w-full">
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

type AccessState =
  | { kind: "loading" }
  | { kind: "ok" }
  | { kind: "suspended"; tenantName?: string }
  | { kind: "no_tenant" };

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const [access, setAccess] = useState<AccessState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setAccess({ kind: "loading" });
      return;
    }
    (async () => {
      // Superadmins bypass tenant gating
      const { data: isSuper } = await supabase.rpc("is_superadmin", { _user_id: user.id });
      if (cancelled) return;
      if (isSuper) {
        setAccess({ kind: "ok" });
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;

      const tenantId = (profile as any)?.tenant_id;
      if (!tenantId) {
        setAccess({ kind: "no_tenant" });
        return;
      }

      const { data: tenant } = await supabase
        .from("tenants")
        .select("id,name,status")
        .eq("id", tenantId)
        .maybeSingle();
      if (cancelled) return;

      if (!tenant) {
        setAccess({ kind: "no_tenant" });
        return;
      }
      if ((tenant as any).status === "suspended") {
        setAccess({ kind: "suspended", tenantName: (tenant as any).name });
        return;
      }
      setAccess({ kind: "ok" });
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (loading || (user && access.kind === "loading")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (access.kind === "suspended" || access.kind === "no_tenant") {
    const isSuspended = access.kind === "suspended";
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
              ? `Your account${access.kind === "suspended" && access.tenantName ? ` (${access.tenantName})` : ""} has been suspended. Please contact support to restore access.`
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

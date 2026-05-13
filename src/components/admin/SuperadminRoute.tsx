import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export function SuperadminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [isSuperadmin, setIsSuperadmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("is_superadmin", { _user_id: user.id }).then(({ data }) => {
      setIsSuperadmin(!!data);
    });
  }, [user]);

  if (!authLoading && !user) {
    return <Navigate to="/superadmin/login" replace />;
  }

  if (authLoading || isSuperadmin === null) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isSuperadmin) return <Navigate to="/superadmin/login" replace />;

  return <>{children}</>;
}

import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function SuperadminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/superadmin/login" replace />;
  if (!user.is_superadmin) return <Navigate to="/superadmin/login" replace />;

  return <>{children}</>;
}

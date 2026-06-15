import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/apiClient";

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  phone?: string | null;
  status?: string;
  is_superadmin: boolean;
  tenant_id?: string | null;
  tenant?: {
    id: string;
    name: string;
    slug?: string;
    status?: string;
    enabled_modules?: string[];
    trial_ends_at?: string | null;
    subscription_end?: string | null;
  } | null;
  roles?: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  refresh: () => Promise<AuthUser | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => { throw new Error("AuthProvider not mounted"); },
  signOut: async () => {},
  refresh: async () => null,
});

async function fetchMe(): Promise<AuthUser | null> {
  try {
    const r = await api.get<{ user: AuthUser }>("/api/auth/me");
    return r.user ?? null;
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 419)) return null;
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const u = await fetchMe();
    setUser(u);
    return u;
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const signIn = useCallback(async (identifier: string, password: string) => {
    const r = await api.post<{ user: AuthUser }>("/api/auth/login", { identifier, password });
    setUser(r.user);
    return r.user;
  }, []);

  const signOut = useCallback(async () => {
    try { await api.post("/api/auth/logout"); } catch { /* ignore */ }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

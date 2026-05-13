import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Helmet } from "react-helmet-async";

export default function SuperadminLogin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [data, setData] = useState({ email: "", password: "" });
  const [checking, setChecking] = useState(true);
  const [alreadySuper, setAlreadySuper] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (authLoading) return;
    if (!user) { setChecking(false); return; }
    supabase.rpc("is_superadmin", { _user_id: user.id }).then(({ data }) => {
      if (cancelled) return;
      setAlreadySuper(!!data);
      setChecking(false);
    });
    return () => { cancelled = true; };
  }, [user, authLoading]);

  if (alreadySuper) return <Navigate to="/superadmin" replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: signIn, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (error || !signIn.user) {
      setLoading(false);
      toast({ title: "Login failed", description: "Invalid email or password.", variant: "destructive" });
      return;
    }
    const { data: isSuper } = await supabase.rpc("is_superadmin", { _user_id: signIn.user.id });
    if (!isSuper) {
      await supabase.auth.signOut();
      setLoading(false);
      toast({ title: "Access denied", description: "This account is not a Superadmin.", variant: "destructive" });
      return;
    }
    setLoading(false);
    navigate("/superadmin", { replace: true });
  };

  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Superadmin Sign In — Prime POS</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4">
        <Card className="w-full max-w-md border-slate-800 bg-slate-900 text-slate-100">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl">Superadmin Console</CardTitle>
            <CardDescription className="text-slate-400">Restricted access — platform owners only</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required autoComplete="email"
                  className="bg-slate-800 border-slate-700"
                  value={data.email} onChange={(e) => setData({ ...data, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} required autoComplete="current-password"
                    className="bg-slate-800 border-slate-700 pr-10"
                    value={data.password} onChange={(e) => setData({ ...data, password: e.target.value })} />
                  <button type="button" onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    aria-label="Toggle password visibility">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign in to Console"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, LogIn, Boxes, ScanBarcode, BarChart3, Store } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { ApiError } from "@/lib/apiClient";
import { useBranding } from "@/hooks/useBranding";


export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const { brandName, brandShort, logoUrl } = useBranding();


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await signIn(loginData.email, loginData.password);
      navigate(u.is_superadmin ? "/superadmin" : "/dashboard");
    } catch (err) {
      const backendUnavailable = err instanceof ApiError && (err.status === 404 || err.status === 502);
      toast({
        title: backendUnavailable ? "Backend not connected" : "Login failed",
        description: backendUnavailable
          ? "The Laravel API was not found. Configure VITE_API_BASE_URL to your VPS backend URL and redeploy the frontend."
          : err instanceof ApiError && err.status === 422
            ? "Invalid email or password."
            : "Could not reach the Laravel backend. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Sign in to Prime POS — Business Management Platform</title>
        <meta name="description" content="Sign in to your Prime POS account to manage point-of-sale, inventory, accounting, HRM, warranty and BI for your business." />
        <link rel="canonical" href="https://primepos.lovable.app/login" />
        <meta property="og:title" content="Sign in to Prime POS" />
        <meta property="og:description" content="Sign in to your Prime POS account to manage point-of-sale, inventory, accounting, HRM, warranty and BI for your business." />
        <meta property="og:url" content="https://primepos.lovable.app/login" />
      </Helmet>
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Classic ledger grid + modern gradient wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at 50% 0%, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 0%, black 30%, transparent 75%)",
        }}
      />
      <div aria-hidden className="pointer-events-none absolute -top-40 -left-32 h-[28rem] w-[28rem] rounded-full bg-primary/20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 -right-24 h-[26rem] w-[26rem] rounded-full bg-info/15 blur-3xl" />

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-2">
        {/* Brand / value column */}
        <section className="hidden lg:flex flex-col gap-8">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={`${brandName} logo`} className="h-12 w-12 rounded-xl object-contain bg-card p-1 shadow-card" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground text-lg font-bold shadow-elevated">
                {brandShort}
              </div>
            )}
            <span className="text-xl font-semibold tracking-tight">{brandName}</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl font-bold leading-tight tracking-tight">
              Inventory &amp; retail management,<br />
              <span className="bg-gradient-primary bg-clip-text text-transparent">built for busy counters</span>
            </h1>
            <p className="max-w-md text-muted-foreground">
              Stock control, barcode POS billing, warehouses, purchases and profit reporting — one platform for every outlet you run.
            </p>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              { icon: Boxes, label: "Live stock & warehouses" },
              { icon: ScanBarcode, label: "Barcode POS billing" },
              { icon: Store, label: "Multi-outlet retail" },
              { icon: BarChart3, label: "Profit & BI reports" },
            ].map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 rounded-lg border border-border/70 glass-card px-3 py-2.5 shadow-card">
                <Icon className="h-4 w-4 text-primary" />
                <span className="text-sm text-foreground/90">{label}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Login column */}
        <div className="flex justify-center">
          <Card className="w-full max-w-md glass-card border-border/70 shadow-elevated">
            <CardHeader className="text-center">
              {logoUrl ? (
                <img src={logoUrl} alt={`${brandName} logo`} className="mx-auto mb-2 h-14 w-14 rounded-xl object-contain bg-card p-1" />
              ) : (
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground font-bold text-lg">
                  {brandShort}
                </div>
              )}
              <CardTitle className="text-2xl">{brandName}</CardTitle>
              <CardDescription>Sign in to manage your inventory &amp; retail operations</CardDescription>
            </CardHeader>

            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" type="email" placeholder="you@company.com" required value={loginData.email} onChange={(e) => setLoginData({ ...loginData, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Input id="login-password" type={showPassword ? "text" : "password"} placeholder="••••••••" required value={loginData.password} onChange={(e) => setLoginData({ ...loginData, password: e.target.value })} />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-3">
                <Button type="submit" className="w-full" disabled={loading}>
                  <LogIn className="mr-2 h-4 w-4" />
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Don't have an account?{" "}
                  <Link to="/register" className="text-primary hover:underline">Register your business</Link>
                </p>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>

    </>
  );
}

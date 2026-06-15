import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { rest } from "@/lib/restResource";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, CreditCard, CheckCircle2, Store, Eye, EyeOff } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { toFriendlyError } from "@/lib/friendlyError";
import { trackEvent } from "@/lib/tracking";

interface Pkg {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  is_trial?: boolean;
}

export default function Register() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<"trial" | "paid" | null>(null);
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    businessName: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    password: "",
  });
  const [packageId, setPackageId] = useState<string>("");

  const set = (k: string, v: string) => setForm((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    (async () => {
      const list = await rest.all<Pkg>("saas_packages", {
        filter: { is_active: true },
        sort: "sort_order",
      }).catch(() => []);
      setPackages(list);
      if (list.length > 0) {
        // Default to trial plan if one exists, otherwise the first plan
        const trial = list.find((p) => p.is_trial);
        setPackageId(trial?.id ?? list[0].id);
      }
    })();
  }, []);

  const selectedPkg = packages.find((p) => p.id === packageId) ?? null;
  const choice: "trial" | "paid" = selectedPkg?.is_trial ? "trial" : "paid";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pw = form.password;
    if (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) {
      toast({
        title: "Weak password",
        description: "Use at least 8 characters with both letters and numbers.",
        variant: "destructive",
      });
      return;
    }
    if (!packageId) {
      toast({ title: "Choose a plan", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { tenantSignup } = await import("@/lib/functions");
      await tenantSignup({
        businessName: form.businessName.trim(),
        contactName: form.contactName.trim(),
        contactEmail: form.contactEmail.trim().toLowerCase(),
        contactPhone: form.contactPhone.trim(),
        address: form.address.trim(),
        password: form.password,
        registrationChoice: choice,
        packageId: packageId,
      });

      // Always sign in so the user can either reach the dashboard or pay
      try {
        await signIn(form.contactEmail.trim().toLowerCase(), form.password);
      } catch {
        toast({ title: "Account created", description: "Please sign in to continue." });
        navigate("/login");
        return;
      }
      if (choice === "trial") {
        const days = selectedPkg?.duration_days ?? 14;
        toast({ title: `Trial activated`, description: `${days} days of full access.` });
        const eid = `lead-${Date.now()}`;
        if ((window as any).fbq) (window as any).fbq("track", "Lead", { content_name: "Trial signup" }, { eventID: eid });
        trackEvent("Lead", {
          event_id: eid,
          user_data: {
            email: form.contactEmail.trim().toLowerCase(),
            phone: form.contactPhone.trim(),
            first_name: form.contactName.trim().split(" ")[0],
            last_name: form.contactName.trim().split(" ").slice(1).join(" ") || undefined,
          },
          custom_data: { content_name: "Trial signup", lead_type: "trial" },
        });
        window.location.assign("/dashboard");
        return;
      }
      // Paid: send to subscription page with chosen plan to pay via gateway
      toast({ title: "Account created", description: "Choose a payment method to activate your plan." });
      const eidPaid = `lead-paid-${Date.now()}`;
      if ((window as any).fbq) (window as any).fbq("track", "Lead", { content_name: "Paid signup" }, { eventID: eidPaid });
      trackEvent("Lead", {
        event_id: eidPaid,
        user_data: {
          email: form.contactEmail.trim().toLowerCase(),
          phone: form.contactPhone.trim(),
          first_name: form.contactName.trim().split(" ")[0],
        },
        custom_data: { content_name: "Paid signup", lead_type: "paid", package_id: packageId },
      });
      window.location.assign(`/subscription?from=register&plan=${encodeURIComponent(packageId)}`);
    } catch (err: any) {
      toast({ title: "Registration failed", description: toFriendlyError(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (done === "paid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md text-center shadow-xl">
          <CardHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <CardTitle className="mt-3">Registration submitted</CardTitle>
            <CardDescription>
              We've received your application for <strong>{form.businessName}</strong>. Your account
              will be activated once our team confirms your payment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} className="w-full">Back to home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Register your business — Prime POS</title>
        <meta name="description" content="Create your Prime POS account and start a free trial of the all-in-one POS, inventory, accounting, HRM and BI platform for your business." />
        <link rel="canonical" href="https://primepos.lovable.app/register" />
        <meta property="og:title" content="Register your business — Prime POS" />
        <meta property="og:description" content="Create your Prime POS account and start a free trial of the all-in-one POS, inventory, accounting, HRM and BI platform for your business." />
        <meta property="og:url" content="https://primepos.lovable.app/register" />
      </Helmet>
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Link to="/" className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
            <Store className="h-6 w-6" />
          </Link>
          <h1 className="text-2xl font-semibold">Register your business</h1>
          <p className="text-sm text-muted-foreground">
          Pick a plan to get started — try the free trial or pay upfront
          </p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Business details</CardTitle>
            <CardDescription>
              Trial activates instantly. Paid signups activate after we confirm your payment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bn">Business name</Label>
                <Input id="bn" required value={form.businessName} onChange={(e) => set("businessName", e.target.value)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contact">Your name</Label>
                  <Input id="contact" required value={form.contactName} onChange={(e) => set("contactName", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" required value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (your login)</Label>
                <Input id="email" type="email" required value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pw">Password</Label>
                <div className="relative">
                  <Input id="pw" type={showPassword ? "text" : "password"} required minLength={8} pattern="(?=.*[A-Za-z])(?=.*\d).{8,}" title="At least 8 characters with letters and numbers" autoComplete="new-password" value={form.password} onChange={(e) => set("password", e.target.value)} />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Min 8 chars, must include letters and numbers.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="addr">Address</Label>
                <Textarea id="addr" rows={2} value={form.address} onChange={(e) => set("address", e.target.value)} />
              </div>

              <div className="space-y-2 rounded-lg border p-3">
                <Label className="text-sm font-semibold">Choose your plan</Label>
                {packages.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No plans available.</p>
                ) : (
                  <div className="grid gap-2">
                    {packages.map((p) => {
                      const selected = packageId === p.id;
                      return (
                        <label
                          key={p.id}
                          className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer text-sm ${
                            selected ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                          }`}
                        >
                          <input
                            type="radio"
                            className="mt-1"
                            checked={selected}
                            onChange={() => setPackageId(p.id)}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 font-medium">
                              {p.is_trial ? (
                                <Sparkles className="h-4 w-4 text-primary" />
                              ) : (
                                <CreditCard className="h-4 w-4 text-primary" />
                              )}
                              <span>{p.name}</span>
                              {p.is_trial && (
                                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                                  Free trial
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {p.is_trial
                                ? `Activates instantly. Full access for ${p.duration_days} days.`
                                : `Activated after super admin confirms payment.`}
                            </div>
                          </div>
                          <span className="text-xs whitespace-nowrap">
                            {p.is_trial ? "Free" : `৳${Number(p.price).toLocaleString()}`} / {p.duration_days}d
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {choice === "trial"
                  ? `Start ${selectedPkg?.duration_days ?? 14}-day free trial`
                  : "Submit & continue"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
}
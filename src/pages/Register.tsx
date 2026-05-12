import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, CreditCard, CheckCircle2, Store, Eye, EyeOff } from "lucide-react";

interface Pkg {
  id: string;
  name: string;
  price: number;
  duration_days: number;
}

const TRIAL_DAYS = 14;

export default function Register() {
  const navigate = useNavigate();
  const { toast } = useToast();
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
  const [choice, setChoice] = useState<"trial" | "paid">("trial");
  const [packageId, setPackageId] = useState<string>("");

  const set = (k: string, v: string) => setForm((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("saas_packages")
        .select("id,name,price,duration_days")
        .eq("is_active", true)
        .order("sort_order");
      const list = (data ?? []) as Pkg[];
      setPackages(list);
      if (list.length > 0) setPackageId(list[0].id);
    })();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast({ title: "Password too short", description: "At least 6 characters.", variant: "destructive" });
      return;
    }
    if (choice === "paid" && !packageId) {
      toast({ title: "Choose a plan", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("tenant-signup", {
        body: {
          businessName: form.businessName.trim(),
          contactName: form.contactName.trim(),
          contactEmail: form.contactEmail.trim().toLowerCase(),
          contactPhone: form.contactPhone.trim(),
          address: form.address.trim(),
          password: form.password,
          registrationChoice: choice,
          packageId: choice === "paid" ? packageId : null,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      if (choice === "trial") {
        // Auto-login the user and go to dashboard
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: form.contactEmail.trim().toLowerCase(),
          password: form.password,
        });
        if (signInErr) {
          toast({ title: "Account created", description: "Please sign in to continue." });
          navigate("/login");
          return;
        }
        toast({ title: `Trial activated`, description: `${TRIAL_DAYS} days of full access.` });
        window.location.assign("/dashboard");
        return;
      }

      setDone("paid");
      toast({ title: "Registration submitted", description: "We'll activate your account once payment is confirmed." });
    } catch (err: any) {
      toast({ title: "Registration failed", description: err.message ?? "Try again.", variant: "destructive" });
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
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Link to="/" className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
            <Store className="h-6 w-6" />
          </Link>
          <h1 className="text-2xl font-semibold">Register your business</h1>
          <p className="text-sm text-muted-foreground">
            Start with a {TRIAL_DAYS}-day free trial or pay upfront
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
                  <Input id="pw" type={showPassword ? "text" : "password"} required minLength={6} value={form.password} onChange={(e) => set("password", e.target.value)} />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="addr">Address</Label>
                <Textarea id="addr" rows={2} value={form.address} onChange={(e) => set("address", e.target.value)} />
              </div>

              <div className="space-y-2 rounded-lg border p-3">
                <Label className="text-sm font-semibold">How would you like to start?</Label>
                <RadioGroup value={choice} onValueChange={(v) => setChoice(v as any)} className="gap-2">
                  <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/40">
                    <RadioGroupItem value="trial" className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 font-medium text-sm">
                        <Sparkles className="h-4 w-4 text-primary" /> Free trial
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Activates immediately. Full access for {TRIAL_DAYS} days.
                      </div>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/40">
                    <RadioGroupItem value="paid" className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 font-medium text-sm">
                        <CreditCard className="h-4 w-4 text-primary" /> Pay now
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Choose a plan. Activated after super admin confirms payment.
                      </div>
                    </div>
                  </label>
                </RadioGroup>

                {choice === "paid" && (
                  <div className="mt-2 space-y-1.5">
                    <Label className="text-xs">Choose plan</Label>
                    {packages.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No plans available.</p>
                    ) : (
                      <div className="grid gap-2">
                        {packages.map((p) => (
                          <label
                            key={p.id}
                            className={`flex items-center justify-between rounded-md border p-2.5 cursor-pointer text-sm ${
                              packageId === p.id ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input type="radio" checked={packageId === p.id} onChange={() => setPackageId(p.id)} />
                              <span className="font-medium">{p.name}</span>
                            </div>
                            <span className="text-xs">
                              ৳{Number(p.price).toLocaleString()} / {p.duration_days}d
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {choice === "trial" ? `Start ${TRIAL_DAYS}-day free trial` : "Submit & continue"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
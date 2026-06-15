import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { rest } from "@/lib/restResource";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Check, Clock, CreditCard, Loader2 } from "lucide-react";
import { trackEvent } from "@/lib/tracking";

interface Pkg {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  features: any;
}
interface PayRow {
  id: string;
  package_id: string | null;
  status: string;
  amount: number;
  currency: string;
  payment_method: string;
  payment_reference: string | null;
  starts_on: string | null;
  ends_on: string | null;
  created_at: string;
}
interface Tenant {
  id: string; name: string; status: string; subscription_end: string | null;
}

const statusVariants: Record<string, string> = {
  active: "bg-green-500/10 text-green-700 border-green-200",
  trial: "bg-blue-500/10 text-blue-700 border-blue-200",
  pending: "bg-amber-500/10 text-amber-700 border-amber-200",
  rejected: "bg-red-500/10 text-red-700 border-red-200",
  expired: "bg-orange-500/10 text-orange-700 border-orange-200",
  suspended: "bg-red-500/10 text-red-700 border-red-200",
};

export default function Subscription() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [history, setHistory] = useState<PayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);

  // Manual submit
  const [open, setOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Pkg | null>(null);
  const [method, setMethod] = useState<"bkash" | "eps" | "offline">("bkash");
  const [reference, setReference] = useState("");
  const [payerName, setPayerName] = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const focusedPlanId = params.get("plan");
  const fromRegister = params.get("from") === "register";

  const load = async () => {
    setLoading(true);
    if (!user) { setLoading(false); return; }
    // Profile/tenant lookup is still via Supabase auth-linked profile (Stage 10 will replace).
    const { data: prof } = await supabase.from("profiles").select("tenant_id").eq("user_id", user.id).maybeSingle();
    const tid = prof?.tenant_id;
    const [t, pls, hist] = await Promise.all([
      tid ? rest.get<Tenant>("tenants", tid).catch(() => null) : Promise.resolve(null),
      rest.all<Pkg>("saas_packages", { filter: { is_active: true }, sort: "sort_order", perPage: 200 }),
      tid ? rest.all<PayRow>("tenant_payments", {
        filter: { tenant_id: tid }, sort: "-created_at", perPage: 200,
      }) : Promise.resolve([] as PayRow[]),
    ]);
    setTenant(t ?? null);
    setPackages(pls ?? []);
    setHistory(hist ?? []);
    setLoading(false);
  };

  useEffect(() => { document.title = "Subscription"; load(); /* eslint-disable-next-line */ }, [user?.id]);

  // Handle redirect from gateway
  useEffect(() => {
    const status = params.get("payment");
    if (!status) return;
    window.history.replaceState({}, "", window.location.pathname + (fromRegister ? "?from=register" : ""));
    if (status === "success") {
      toast({ title: "Payment received", description: "Subscription activated." });
      // Fire Purchase event (client + server CAPI). Best-effort: amount unknown here,
      // server can be enriched later from tenant_payments lookup.
      const eid = `purchase-${Date.now()}`;
      const ref = params.get("ref") || undefined;
      if ((window as any).fbq) (window as any).fbq("track", "Purchase", { currency: "BDT", value: 0 }, { eventID: eid });
      trackEvent("Purchase", {
        event_id: eid,
        custom_data: { currency: "BDT", value: 0, payment_reference: ref },
      });
      setTimeout(() => navigate("/dashboard", { replace: true }), 1200);
    } else if (status === "cancelled") toast({ title: "Payment cancelled", variant: "destructive" });
    else if (status === "unconfigured") toast({ title: "Gateway not configured", description: "Please contact support.", variant: "destructive" });
    else toast({ title: `Payment ${status}`, variant: "destructive" });
    // eslint-disable-next-line
  }, []);

  const payNow = async (plan: Pkg, gateway: "bkash" | "eps") => {
    const key = `${plan.id}:${gateway}`;
    setPayingId(key);
    try {
      const { paymentInit } = await import("@/lib/functions");
      const data = await paymentInit({ gateway, package_id: plan.id, from: fromRegister ? "register" : "subscription" });
      if (data?.url) { window.location.href = data.url; return; }
      throw new Error("Could not start payment");
    } catch (e: any) {
      toast({ title: "Payment init failed", description: e.message, variant: "destructive" });
    } finally {
      setPayingId((c) => (c === key ? null : c));
    }
  };

  const openSubmit = (plan: Pkg) => {
    setSelectedPlan(plan);
    setReference(""); setPayerName(""); setPayerPhone(""); setProofUrl(""); setNotes("");
    setMethod("bkash"); setOpen(true);
  };

  const submitManual = async () => {
    if (!selectedPlan || !tenant) return;
    if (method !== "offline" && !reference.trim()) {
      toast({ title: "Reference required", variant: "destructive" }); return;
    }
    setSubmitting(true);
    let error: any = null;
    try {
      await rest.create("tenant_payments", {
        tenant_id: tenant.id,
        package_id: selectedPlan.id,
        amount: selectedPlan.price,
        currency: "BDT",
        payment_method: method,
        payment_reference: reference.trim() || null,
        payer_name: payerName.trim() || null,
        payer_phone: payerPhone.trim() || null,
        proof_url: proofUrl.trim() || null,
        notes: notes.trim() || null,
        status: "pending",
        created_by: user?.id ?? null,
      });
    } catch (e: any) {
      error = e;
    }
    setSubmitting(false);
    if (error) { toast({ title: "Submit failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Payment submitted", description: "We'll verify and activate your plan shortly." });
    setOpen(false);
    load();
  };

  const ends = tenant?.subscription_end ? new Date(tenant.subscription_end) : null;
  const expired = ends ? ends < new Date() : false;
  const daysLeft = ends ? Math.max(0, Math.ceil((ends.getTime() - Date.now()) / 86400_000)) : null;
  const visible = focusedPlanId ? packages.filter(p => p.id === focusedPlanId) : packages;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between gap-2 px-4">
          <Button asChild variant="ghost" size="sm">
            <Link to="/dashboard"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link>
          </Button>
          <div className="text-sm font-medium">Subscription</div>
          <div className="w-16" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4 text-primary" />
              {tenant?.name ?? "Your business"}
            </CardTitle>
            <CardDescription>Current plan status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className={statusVariants[tenant?.status ?? "pending"]}>
                {tenant?.status ?? "—"}
              </Badge>
              {ends ? (
                <div className="text-sm">
                  {expired ? <span className="text-destructive font-medium">Expired on {ends.toLocaleDateString()}</span>
                    : <span>Renews on <span className="font-medium">{ends.toLocaleDateString()}</span><span className="text-muted-foreground"> · {daysLeft} day(s) left</span></span>}
                </div>
              ) : <span className="text-sm text-muted-foreground">No active subscription</span>}
            </div>
          </CardContent>
        </Card>

        <section>
          <h2 className="mb-3 text-base sm:text-lg font-semibold">
            {focusedPlanId ? "Choose payment method" : "Choose a plan"}
          </h2>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((p) => (
                <Card key={p.id} className="flex flex-col">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{p.name}</CardTitle>
                    <div className="mt-2">
                      <span className="text-2xl font-bold">{p.price === 0 ? "Free" : `BDT ${Number(p.price).toLocaleString()}`}</span>
                      <span className="text-xs text-muted-foreground"> / {p.duration_days} days</span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <ul className="flex-1 space-y-1.5 text-sm">
                      {(Array.isArray(p.features) ? p.features : []).map((f: string, i: number) => (
                        <li key={i} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-primary" /><span>{f}</span></li>
                      ))}
                    </ul>
                    <div className="mt-4 space-y-2">
                      <Button className="w-full" onClick={() => payNow(p, "bkash")} disabled={p.price === 0 || !!payingId}>
                        {payingId === `${p.id}:bkash` && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Pay with bKash
                      </Button>
                      <Button className="w-full" onClick={() => payNow(p, "eps")} disabled={p.price === 0 || !!payingId}>
                        {payingId === `${p.id}:eps` && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Pay with EPS
                      </Button>
                      <Button variant="outline" className="w-full" onClick={() => openSubmit(p)} disabled={p.price === 0}>
                        {p.price === 0 ? "Trial plan" : "Submit manually"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-base sm:text-lg font-semibold">Payment history</h2>
          <Card>
            <CardContent className="p-0">
              {history.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No payments submitted yet.</div>
              ) : (
                <ul className="divide-y">
                  {history.map((h) => (
                    <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className={statusVariants[h.status]}>{h.status}</Badge>
                          <span className="capitalize">{h.payment_method}</span>
                          <span className="font-medium">{h.currency} {Number(h.amount).toLocaleString()}</span>
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {new Date(h.created_at).toLocaleString()}
                          {h.payment_reference && ` · ref ${h.payment_reference}`}
                        </div>
                      </div>
                      {h.status === "active" && h.ends_on && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />until {new Date(h.ends_on).toLocaleDateString()}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Submit payment — {selectedPlan?.name}</DialogTitle>
            <DialogDescription>
              {selectedPlan && <>BDT {Number(selectedPlan.price).toLocaleString()} for {selectedPlan.duration_days} days. Activated after super admin approval.</>}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Payment method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bkash">bKash</SelectItem>
                  <SelectItem value="eps">EPS / SSLCommerz</SelectItem>
                  <SelectItem value="offline">Offline / Bank deposit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Transaction / reference {method !== "offline" && <span className="text-destructive">*</span>}</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder={method === "bkash" ? "trxID" : "reference"} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Payer name</Label><Input value={payerName} onChange={(e) => setPayerName(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Payer phone</Label><Input value={payerPhone} onChange={(e) => setPayerPhone(e.target.value)} /></div>
            </div>
            <div className="space-y-1.5"><Label>Proof URL (optional)</Label><Input value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} placeholder="Link to screenshot" /></div>
            <div className="space-y-1.5"><Label>Notes (optional)</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submitManual} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit for approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
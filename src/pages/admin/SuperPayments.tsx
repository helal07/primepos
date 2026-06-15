import { useEffect, useState } from "react";
import { rest } from "@/lib/restResource";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, Wallet, CheckCircle2, Clock, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Row {
  id: string;
  tenant_id: string;
  package_id: string | null;
  status: string;
  amount: number;
  currency: string;
  payment_method: string;
  payment_reference: string | null;
  payer_name: string | null;
  payer_phone: string | null;
  proof_url: string | null;
  created_at: string;
  ends_on: string | null;
  notes: string | null;
  tenant?: { name: string; email: string };
  pkg?: { name: string; duration_days: number };
}

const statusVariants: Record<string, string> = {
  active: "bg-green-500/10 text-green-700 border-green-200",
  pending: "bg-amber-500/10 text-amber-700 border-amber-200",
  rejected: "bg-red-500/10 text-red-700 border-red-200",
};

export default function SuperPayments() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "active" | "rejected">("all");

  const load = async () => {
    setLoading(true);
    const list = await rest.all<Row>("tenant_payments", { sort: "-created_at", perPage: 500 });
    const tIds = Array.from(new Set(list.map(r => r.tenant_id)));
    const pIds = Array.from(new Set(list.map(r => r.package_id).filter(Boolean) as string[]));
    const [tenants, pkgs] = await Promise.all([
      tIds.length ? rest.all<any>("tenants", { filter: { id: { in: tIds.join(",") } }, perPage: 500 }) : Promise.resolve([] as any[]),
      pIds.length ? rest.all<any>("saas_packages", { filter: { id: { in: pIds.join(",") } }, perPage: 200 }) : Promise.resolve([] as any[]),
    ]);
    const tMap = new Map(tenants.map((t: any) => [t.id, t]));
    const pMap = new Map(pkgs.map((p: any) => [p.id, p]));
    list.forEach(r => { r.tenant = tMap.get(r.tenant_id); r.pkg = r.package_id ? pMap.get(r.package_id) : undefined; });
    setRows(list); setLoading(false);
  };

  useEffect(() => { document.title = "Super Admin — Payments"; load(); }, []);

  const act = async (id: string, action: "approve" | "reject") => {
    setBusy(id + action);
    try {
      const { superApprovePayment } = await import("@/lib/functions");
      await superApprovePayment(id, action);
      toast({ title: `Payment ${action}d` });
      load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  const visible = rows.filter(r => filter === "all" || r.status === filter);

  const stats = {
    total: rows.length,
    pending: rows.filter(r => r.status === "pending").length,
    active: rows.filter(r => r.status === "active").length,
    rejected: rows.filter(r => r.status === "rejected").length,
    revenue: rows.filter(r => r.status === "active").reduce((s, r) => s + Number(r.amount || 0), 0),
    currency: rows.find(r => r.status === "active")?.currency ?? "BDT",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Subscription payments</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Approve to extend the tenant's subscription.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>All</Button>
          <Button size="sm" variant={filter === "pending" ? "default" : "outline"} onClick={() => setFilter("pending")}>Pending</Button>
          <Button size="sm" variant={filter === "active" ? "default" : "outline"} onClick={() => setFilter("active")}>Active</Button>
          <Button size="sm" variant={filter === "rejected" ? "default" : "outline"} onClick={() => setFilter("rejected")}>Rejected</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Wallet className="h-5 w-5" /></div>
          <div><div className="text-xs text-muted-foreground">Total revenue</div><div className="text-lg font-semibold">{stats.currency} {stats.revenue.toLocaleString()}</div></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-green-500/10 text-green-600 flex items-center justify-center"><CheckCircle2 className="h-5 w-5" /></div>
          <div><div className="text-xs text-muted-foreground">Active</div><div className="text-lg font-semibold">{stats.active}</div></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center"><Clock className="h-5 w-5" /></div>
          <div><div className="text-xs text-muted-foreground">Pending</div><div className="text-lg font-semibold">{stats.pending}</div></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-red-500/10 text-red-600 flex items-center justify-center"><XCircle className="h-5 w-5" /></div>
          <div><div className="text-xs text-muted-foreground">Rejected</div><div className="text-lg font-semibold">{stats.rejected}</div></div>
        </CardContent></Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Submissions</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map(r => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium">{r.tenant?.name ?? r.tenant_id}</div>
                        <div className="text-xs text-muted-foreground">{r.tenant?.email}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{r.pkg?.name ?? "—"}</div>
                        {r.pkg?.duration_days && <div className="text-xs text-muted-foreground">+{r.pkg.duration_days} days</div>}
                      </TableCell>
                      <TableCell>{r.currency} {Number(r.amount).toLocaleString()}</TableCell>
                      <TableCell className="capitalize">{r.payment_method}</TableCell>
                      <TableCell>
                        <div className="text-sm">{r.payment_reference ?? "—"}</div>
                        {r.payer_name && <div className="text-xs text-muted-foreground">{r.payer_name} {r.payer_phone && `· ${r.payer_phone}`}</div>}
                        {r.proof_url && <a className="text-xs text-primary underline" href={r.proof_url} target="_blank" rel="noreferrer">View proof</a>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusVariants[r.status] ?? ""}>{r.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        {r.status === "pending" ? (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" disabled={busy === r.id + "approve"} onClick={() => act(r.id, "approve")}>Approve</Button>
                            <Button size="sm" variant="outline" disabled={busy === r.id + "reject"} onClick={() => act(r.id, "reject")}>Reject</Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">{r.ends_on ? `→ ${new Date(r.ends_on).toLocaleDateString()}` : "—"}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {visible.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground">No payment submissions.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
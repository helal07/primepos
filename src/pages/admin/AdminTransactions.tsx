import { PageHeader } from "@/components/layout/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useTenants } from "@/hooks/useSaasAdmin";

export default function AdminTransactions() {
  const { data: tenants } = useTenants();

  return (
    <div className="space-y-6">
      <PageHeader title="SaaS Transactions" subtitle="View payment history and manually record transactions" />

      <div className="rounded-xl border border-border bg-card/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-base font-semibold text-foreground">Transaction History</h3>
        </div>
        <div className="p-4">
          <p className="text-sm text-muted-foreground mb-4">
            Payment gateway integration (bKash, SSLCommerz, EPS) will be configured in Settings.
            Transaction records will appear here once the gateway is connected.
          </p>
          <Table>
            <TableHeader>
              <TableRow className="border-border bg-card">
                <TableHead className="text-muted-foreground">Tenant</TableHead>
                <TableHead className="text-muted-foreground">Package</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Subscription End</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants?.map((t) => (
                <TableRow key={t.id} className="border-border hover:bg-muted/50">
                  <TableCell className="font-medium text-foreground">{t.name}</TableCell>
                  <TableCell className="text-foreground/90">{(t as any).saas_packages?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      t.status === "active" ? "bg-emerald-500/20 text-primary border-emerald-500/30" :
                      t.status === "suspended" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                      "bg-slate-700 text-muted-foreground border-slate-600"
                    }>{t.status}</Badge>
                  </TableCell>
                  <TableCell className="text-foreground/90">{t.subscription_end ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

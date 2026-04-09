import { PageHeader } from "@/components/layout/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useTenants } from "@/hooks/useSaasAdmin";

export default function AdminTransactions() {
  const { data: tenants } = useTenants();

  return (
    <div className="space-y-6">
      <PageHeader title="SaaS Transactions" subtitle="View payment history and manually record transactions" />

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h3 className="text-base font-semibold text-white">Transaction History</h3>
        </div>
        <div className="p-4">
          <p className="text-sm text-slate-400 mb-4">
            Payment gateway integration (bKash, SSLCommerz, EPS) will be configured in Settings.
            Transaction records will appear here once the gateway is connected.
          </p>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 bg-slate-900">
                <TableHead className="text-slate-400">Tenant</TableHead>
                <TableHead className="text-slate-400">Package</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400">Subscription End</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants?.map((t) => (
                <TableRow key={t.id} className="border-slate-800 hover:bg-slate-800/50">
                  <TableCell className="font-medium text-white">{t.name}</TableCell>
                  <TableCell className="text-slate-300">{(t as any).saas_packages?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      t.status === "active" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                      t.status === "suspended" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                      "bg-slate-700 text-slate-400 border-slate-600"
                    }>{t.status}</Badge>
                  </TableCell>
                  <TableCell className="text-slate-300">{t.subscription_end ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

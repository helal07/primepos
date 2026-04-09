import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useTenants } from "@/hooks/useSaasAdmin";

export default function AdminTransactions() {
  const { data: tenants } = useTenants();

  return (
    <div className="space-y-6">
      <PageHeader title="SaaS Transactions" subtitle="View payment history and manually record transactions" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Payment gateway integration (bKash, SSLCommerz, EPS) will be configured in Settings.
            Transaction records will appear here once the gateway is connected.
          </p>
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Subscription End</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants?.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>{(t as any).saas_packages?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{t.status}</Badge>
                    </TableCell>
                    <TableCell>{t.subscription_end ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

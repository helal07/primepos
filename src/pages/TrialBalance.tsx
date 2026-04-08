import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccounts } from "@/hooks/useAccounting";

export default function TrialBalance() {
  const { data: accounts, isLoading } = useAccounts();

  const grouped = (accounts ?? []).reduce((acc: any, a: any) => {
    const bal = Number(a.balance);
    if (!acc[a.type]) acc[a.type] = { debit: 0, credit: 0, items: [] };
    if (["asset", "expense"].includes(a.type)) {
      acc[a.type].debit += Math.abs(bal);
    } else {
      acc[a.type].credit += Math.abs(bal);
    }
    acc[a.type].items.push(a);
    return acc;
  }, {} as Record<string, { debit: number; credit: number; items: any[] }>);

  const totalDebit = Object.values(grouped).reduce((s: number, g: any) => s + g.debit, 0);
  const totalCredit = Object.values(grouped).reduce((s: number, g: any) => s + g.credit, 0);

  return (
    <div className="space-y-4">
      <PageHeader title="Trial Balance" description="Summary of all account balances" />
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 5 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                ))
              ) : (accounts ?? []).length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No accounts to display</TableCell></TableRow>
              ) : (
                <>
                  {(accounts ?? []).map((a: any) => {
                    const bal = Number(a.balance);
                    const isDebit = ["asset", "expense"].includes(a.type);
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-mono text-sm">{a.code}</TableCell>
                        <TableCell className="font-medium">{a.name}</TableCell>
                        <TableCell className="capitalize">{a.type}</TableCell>
                        <TableCell className="text-right">{isDebit && bal !== 0 ? `৳${Math.abs(bal).toLocaleString()}` : "—"}</TableCell>
                        <TableCell className="text-right">{!isDebit && bal !== 0 ? `৳${Math.abs(bal).toLocaleString()}` : "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="font-bold border-t-2">
                    <TableCell colSpan={3}>Total</TableCell>
                    <TableCell className="text-right">৳{totalDebit.toLocaleString()}</TableCell>
                    <TableCell className="text-right">৳{totalCredit.toLocaleString()}</TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

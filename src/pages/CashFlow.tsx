import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAccounts, useTransactions } from "@/hooks/useAccounting";
import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";

export default function CashFlow() {
  const { data: transactions } = useTransactions();

  const cashTxns = (transactions ?? []).filter((t: any) =>
    t.accounts?.name?.toLowerCase().includes("cash") ||
    t.accounts?.name?.toLowerCase().includes("bank")
  );

  const totalInflow = cashTxns.reduce((s: number, t: any) => s + Number(t.debit), 0);
  const totalOutflow = cashTxns.reduce((s: number, t: any) => s + Number(t.credit), 0);
  const netCash = totalInflow - totalOutflow;

  return (
    <div className="space-y-4">
      <PageHeader title="Cash Flow" description="Track cash inflows and outflows" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
              <ArrowDownLeft className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Inflow</div>
              <div className="text-xl font-bold text-green-600">৳{totalInflow.toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
              <ArrowUpRight className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Outflow</div>
              <div className="text-xl font-bold text-red-600">৳{totalOutflow.toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Net Cash</div>
              <div className="text-xl font-bold">৳{netCash.toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Cash Transactions</CardTitle></CardHeader>
        <CardContent>
          {cashTxns.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No cash transactions yet. Create journal entries with cash/bank accounts to see data here.</div>
          ) : (
            <div className="space-y-2">
              {cashTxns.slice(0, 20).map((t: any) => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <div className="font-medium text-sm">{t.description || t.reference || "Transaction"}</div>
                    <div className="text-xs text-muted-foreground">{new Date(t.transaction_date).toLocaleDateString()} · {t.accounts?.name}</div>
                  </div>
                  <div className={`font-medium ${Number(t.debit) > 0 ? "text-green-600" : "text-red-600"}`}>
                    {Number(t.debit) > 0 ? `+৳${Number(t.debit).toLocaleString()}` : `-৳${Number(t.credit).toLocaleString()}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

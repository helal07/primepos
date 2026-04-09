import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function ExpenseReport() {
  const [from, setFrom] = useState(() => new Date(new Date().setDate(1)).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const { data, isLoading } = useQuery({
    queryKey: ["report_expenses", from, to],
    queryFn: async () => {
      const { data } = await supabase.from("transactions").select("id, transaction_date, description, debit, credit, type, accounts(name)").eq("type", "expense").gte("transaction_date", from).lte("transaction_date", to).order("transaction_date", { ascending: false });
      const items = data ?? [];
      const total = items.reduce((s, r: any) => s + Number(r.debit), 0);
      const byAccount: Record<string, number> = {};
      items.forEach((t: any) => {
        const name = t.accounts?.name || "Other";
        byAccount[name] = (byAccount[name] || 0) + Number(t.debit);
      });
      return { items, total, byAccount: Object.entries(byAccount).sort((a, b) => b[1] - a[1]) };
    },
  });

  const fmt = (n: number) => n.toLocaleString("en", { minimumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      <PageHeader title="Expense Report" subtitle="All expense transactions" />
      <div className="flex flex-wrap gap-3 items-end">
        <div><Label>From</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-44" /></div>
        <div><Label>To</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-44" /></div>
      </div>
      {isLoading ? <Skeleton className="h-60 w-full" /> : data && (
        <>
          <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Total Expenses</p><p className="text-2xl font-bold text-destructive">৳ {fmt(data.total)}</p></CardContent></Card>
          <div className="grid md:grid-cols-2 gap-6">
            <Card><CardContent className="pt-4">
              <h3 className="font-semibold mb-3">By Account</h3>
              <Table><TableHeader><TableRow><TableHead>Account</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>{data.byAccount.map(([name, amount]) => (
                <TableRow key={name}><TableCell>{name}</TableCell><TableCell className="text-right">৳ {fmt(amount)}</TableCell></TableRow>
              ))}</TableBody></Table>
            </CardContent></Card>
            <Card><CardContent className="pt-4">
              <h3 className="font-semibold mb-3">Transactions ({data.items.length})</h3>
              <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>{data.items.map((t: any) => (
                <TableRow key={t.id}><TableCell>{t.transaction_date}</TableCell><TableCell>{t.description || "-"}</TableCell><TableCell className="text-right">৳ {fmt(Number(t.debit))}</TableCell></TableRow>
              ))}{data.items.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No expenses found</TableCell></TableRow>}</TableBody></Table>
            </CardContent></Card>
          </div>
        </>
      )}
    </div>
  );
}

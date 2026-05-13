import { useState } from "react";
import { Link } from "react-router-dom";
import { useExpenses, useExpenseCategories, useExpenseMutations } from "@/hooks/useExpenses";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, FolderTree } from "lucide-react";

export default function Expenses() {
  const [from, setFrom] = useState(() => new Date(new Date().setDate(1)).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");

  const { data: expenses, isLoading } = useExpenses({ from, to, categoryId, status });
  const { data: categories } = useExpenseCategories();
  const { remove } = useExpenseMutations();

  const filtered = (expenses ?? []).filter((e) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (e.reference_no?.toLowerCase().includes(s) || e.expense_note?.toLowerCase().includes(s) || e.contact_name?.toLowerCase().includes(s));
  });

  const totals = filtered.reduce(
    (acc, e) => {
      acc.total += Number(e.total_amount || 0);
      if (e.payment_status === "paid") acc.paid += Number(e.total_amount || 0);
      else acc.due += Number(e.payment_due || e.total_amount || 0);
      return acc;
    },
    { total: 0, paid: 0, due: 0 }
  );

  const fmt = (n: number) => `৳ ${Math.round(n).toLocaleString()}`;

  return (
    <div className="space-y-6">
      <PageHeader title="Expenses" description="Track and manage business expenses" />

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-muted-foreground">From</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">To</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Category</label>
          <Select value={categoryId || "all"} onValueChange={(v) => setCategoryId(v === "all" ? "" : v)}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Status</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="due">Due</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Input className="w-56 ml-auto" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button asChild variant="outline" className="gap-2"><Link to="/expenses/categories"><FolderTree className="h-4 w-4" /> Categories</Link></Button>
        <Button asChild className="gap-2"><Link to="/expenses/add"><Plus className="h-4 w-4" /> Add Expense</Link></Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total</p><p className="text-xl font-bold">{fmt(totals.total)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Paid</p><p className="text-xl font-bold text-emerald-600">{fmt(totals.paid)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Due</p><p className="text-xl font-bold text-destructive">{fmt(totals.due)}</p></CardContent></Card>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Sub Category</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Due</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={10}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No expenses found</TableCell></TableRow>
            ) : filtered.map((e) => (
              <TableRow key={e.id}>
                <TableCell>{new Date(e.expense_date).toLocaleString()}</TableCell>
                <TableCell className="font-mono text-xs">{e.reference_no}</TableCell>
                <TableCell>{e.expense_categories?.name || "—"}</TableCell>
                <TableCell>{e.sub?.name || "—"}</TableCell>
                <TableCell>{e.warehouses?.name || "—"}</TableCell>
                <TableCell>
                  <Badge variant={e.payment_status === "paid" ? "default" : e.payment_status === "due" ? "destructive" : "secondary"}>
                    {e.payment_status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">{fmt(Number(e.total_amount))}</TableCell>
                <TableCell className="text-right">{fmt(Number(e.payment_due || 0))}</TableCell>
                <TableCell>{e.contact_name || "—"}</TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="icon"><Link to={`/expenses/${e.id}/edit`}><Pencil className="h-4 w-4" /></Link></Button>
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete this expense?")) remove.mutate(e.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
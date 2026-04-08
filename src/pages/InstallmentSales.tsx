import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useInstallmentSales } from "@/hooks/useInstallments";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Printer, CreditCard } from "lucide-react";

export default function InstallmentSales() {
  const navigate = useNavigate();
  const { data, isLoading } = useInstallmentSales();
  const [search, setSearch] = useState("");

  const filtered = data?.filter((s: any) => {
    const term = search.toLowerCase();
    return s.invoice_no?.toLowerCase().includes(term) || s.customers?.name?.toLowerCase().includes(term);
  });

  const statusColor = (s: string) => s === "completed" ? "default" : s === "defaulted" ? "destructive" : "secondary";

  return (
    <div className="space-y-6">
      <PageHeader title="Installment Sales" description="Track all installment sales">
        <Button onClick={() => navigate("/installment/sales/add")}>
          <Plus className="h-4 w-4 mr-2" /> New Sale
        </Button>
      </PageHeader>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search invoice or customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Down Payment</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
            )) : !filtered?.length ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No sales found</TableCell></TableRow>
            ) : filtered.map((s: any) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.invoice_no}</TableCell>
                <TableCell>{s.customers?.name || "—"}</TableCell>
                <TableCell>{s.products?.name || "—"}</TableCell>
                <TableCell className="text-right">{Number(s.total_amount).toFixed(2)}</TableCell>
                <TableCell className="text-right">{Number(s.down_payment).toFixed(2)}</TableCell>
                <TableCell className="text-right">{Number(s.remaining_amount).toFixed(2)}</TableCell>
                <TableCell><Badge variant={statusColor(s.status)}>{s.status}</Badge></TableCell>
                <TableCell className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => navigate(`/installment/collections?sale=${s.id}`)}><CreditCard className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => navigate(`/installment/agreement/${s.id}`)}><Printer className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

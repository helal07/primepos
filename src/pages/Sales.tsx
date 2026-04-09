import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, Eye, Trash2, Pencil, Printer, ChevronDown, FileText } from "lucide-react";
import { useSales, useSaleMutations } from "@/hooks/useSales";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const paymentBadge = (s: string) => {
  switch (s) {
    case "paid": return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>;
    case "partial": return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Partial</Badge>;
    case "due": case "unpaid": return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Due</Badge>;
    default: return <Badge variant="outline">{s}</Badge>;
  }
};

const statusBadge = (s: string) => {
  switch (s) {
    case "completed": return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>;
    case "draft": return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Draft</Badge>;
    case "returned": return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Returned</Badge>;
    default: return <Badge variant="outline">{s}</Badge>;
  }
};

export default function Sales() {
  const navigate = useNavigate();
  const { data: sales, isLoading } = useSales();
  const { deleteSale } = useSaleMutations();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [perPage, setPerPage] = useState("25");

  const filtered = (sales ?? []).filter((s: any) => {
    const matchSearch =
      s.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      s.customers?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    const matchPayment = paymentFilter === "all" || s.payment_status === paymentFilter;
    return matchSearch && matchStatus && matchPayment;
  });

  const totalAmount = filtered.reduce((sum: number, s: any) => sum + Number(s.total_amount || 0), 0);
  const totalPaid = filtered.reduce((sum: number, s: any) => {
    if (s.payment_status === "paid") return sum + Number(s.total_amount || 0);
    return sum;
  }, 0);
  const totalDue = totalAmount - totalPaid;
  const paidCount = filtered.filter((s: any) => s.payment_status === "paid").length;
  const dueCount = filtered.filter((s: any) => s.payment_status === "unpaid" || s.payment_status === "due").length;
  const partialCount = filtered.filter((s: any) => s.payment_status === "partial").length;

  const handleExportCSV = () => {
    const headers = ["Invoice", "Date", "Customer", "Payment Status", "Payment Method", "Total", "Status"];
    const rows = filtered.map((s: any) => [
      s.invoice_number, new Date(s.sale_date).toLocaleDateString(),
      s.customers?.name || "Walk-in", s.payment_status, s.payment_method || "", s.total_amount, s.status
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "sales.csv"; a.click();
    toast.success("CSV exported");
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="All Sales"
        description="View and manage all sales transactions"
        actions={
          <Button onClick={() => navigate("/sales/add")}>
            <Plus className="h-4 w-4 mr-1" /> Add Sale
          </Button>
        }
      />
      <Card>
        <CardContent className="pt-6">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show</span>
              <Select value={perPage} onValueChange={setPerPage}>
                <SelectTrigger className="w-[70px] h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">entries</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <FileText className="h-3.5 w-3.5 mr-1" /> Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="h-3.5 w-3.5 mr-1" /> Print
              </Button>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px] h-8"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="returned">Returned</SelectItem>
                </SelectContent>
              </Select>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-[130px] h-8"><SelectValue placeholder="Payment" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payment</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="unpaid">Due</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 w-[160px]" />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto print-area">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[100px]">Action</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Invoice No.</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-right">Total Paid</TableHead>
                  <TableHead className="text-right">Sale Due</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 10 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No sales found. Create your first sale!</TableCell></TableRow>
                ) : (
                  filtered.slice(0, Number(perPage)).map((sale: any) => {
                    const paid = sale.payment_status === "paid" ? Number(sale.total_amount) : 0;
                    const due = Number(sale.total_amount) - paid;
                    return (
                      <TableRow
                        key={sale.id}
                        className="cursor-pointer hover:bg-muted/30"
                        onClick={() => navigate(`/sales/${sale.id}`)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                                Actions <ChevronDown className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem onClick={() => navigate(`/sales/${sale.id}`)}>
                                <Eye className="h-4 w-4 mr-2" /> View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/sales/${sale.id}/edit`)}>
                                <Pencil className="h-4 w-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/sales/${sale.id}`)}>
                                <Printer className="h-4 w-4 mr-2" /> Print Invoice
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  if (confirm("Delete this sale?")) deleteSale.mutate(sale.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell className="text-sm">{new Date(sale.sale_date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium text-sm">{sale.invoice_number}</TableCell>
                        <TableCell className="text-sm">{sale.customers?.name || "Walk-in"}</TableCell>
                        <TableCell>{paymentBadge(sale.payment_status)}</TableCell>
                        <TableCell className="text-sm capitalize">{sale.payment_method || "—"}</TableCell>
                        <TableCell className="text-right font-medium">৳{Number(sale.total_amount).toLocaleString()}</TableCell>
                        <TableCell className="text-right text-sm">৳{paid.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-sm">{due > 0 ? `৳${due.toLocaleString()}` : "৳0"}</TableCell>
                        <TableCell>{statusBadge(sale.status)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
              {!isLoading && filtered.length > 0 && (
                <TableFooter>
                  <TableRow className="bg-muted/70 font-semibold">
                    <TableCell colSpan={4} className="text-center font-bold">Total:</TableCell>
                    <TableCell className="text-xs">
                      {paidCount > 0 && <div>Paid - {paidCount}</div>}
                      {partialCount > 0 && <div>Partial - {partialCount}</div>}
                      {dueCount > 0 && <div>Due - {dueCount}</div>}
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right font-bold">৳{totalAmount.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-bold">৳{totalPaid.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-bold text-destructive">৳{totalDue.toLocaleString()}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>

          <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
            <span>Showing 1 to {Math.min(Number(perPage), filtered.length)} of {filtered.length} entries</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

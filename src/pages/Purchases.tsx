import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Trash2, Eye, Pencil, Printer, ChevronDown, FileText, FileSpreadsheet, File } from "lucide-react";
import { usePurchases, usePurchaseMutations } from "@/hooks/usePurchases";
import { toast } from "sonner";

const statusBadge = (s: string) => {
  switch (s) {
    case "received": return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Received</Badge>;
    case "partial": return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Partial</Badge>;
    case "ordered": return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Ordered</Badge>;
    case "pending": return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Pending</Badge>;
    case "cancelled": return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Cancelled</Badge>;
    default: return <Badge variant="outline">{s}</Badge>;
  }
};

const paymentBadge = (s: string) => {
  switch (s) {
    case "paid": return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>;
    case "partial": return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Partial</Badge>;
    case "due": case "unpaid": return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Due</Badge>;
    default: return <Badge variant="outline">{s}</Badge>;
  }
};

export default function Purchases() {
  const navigate = useNavigate();
  const { data: purchases, isLoading } = usePurchases();
  const { deletePurchase } = usePurchaseMutations();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [perPage, setPerPage] = useState("25");

  const filtered = (purchases ?? []).filter((p: any) => {
    const matchSearch =
      p.reference_number?.toLowerCase().includes(search.toLowerCase()) ||
      p.suppliers?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchPayment = paymentFilter === "all" || p.payment_status === paymentFilter;
    return matchSearch && matchStatus && matchPayment;
  });

  const totalAmount = filtered.reduce((sum: number, p: any) => sum + Number(p.total_amount || 0), 0);
  const paymentDue = filtered.reduce((sum: number, p: any) => {
    if (p.payment_status !== "paid") return sum + Number(p.total_amount || 0);
    return sum;
  }, 0);
  const paidCount = filtered.filter((p: any) => p.payment_status === "paid").length;
  const dueCount = filtered.filter((p: any) => p.payment_status === "unpaid" || p.payment_status === "due").length;
  const partialCount = filtered.filter((p: any) => p.payment_status === "partial").length;

  const handleExportCSV = () => {
    const headers = ["Reference", "Date", "Supplier", "Status", "Payment", "Total"];
    const rows = filtered.map((p: any) => [
      p.reference_number, new Date(p.purchase_date).toLocaleDateString(),
      p.suppliers?.name || "", p.status, p.payment_status, p.total_amount
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "purchases.csv"; a.click();
    toast.success("CSV exported");
  };

  const handlePrint = () => window.print();

  return (
    <div className="space-y-4">
      <PageHeader title="All Purchases" description="Manage purchase records" actions={
        <Button onClick={() => navigate("/purchases/add")}>
          <Plus className="h-4 w-4 mr-2" /> Add Purchase
        </Button>
      } />

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
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-3.5 w-3.5 mr-1" /> Print
              </Button>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px] h-8"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="ordered">Ordered</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
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
                  <TableHead>Reference No</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Purchase Status</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead className="text-right">Grand Total</TableHead>
                  <TableHead className="text-right">Payment Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No purchases found</TableCell></TableRow>
                ) : (
                  filtered.slice(0, Number(perPage)).map((p: any) => (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer hover:bg-muted/30"
                      onClick={() => navigate(`/purchases/${p.id}`)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                              Actions <ChevronDown className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={() => navigate(`/purchases/${p.id}`)}>
                              <Eye className="h-4 w-4 mr-2" /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.print()}>
                              <Printer className="h-4 w-4 mr-2" /> Print
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/purchases/${p.id}/edit`)}>
                              <Pencil className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                if (confirm("Delete this purchase?")) deletePurchase.mutate(p.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell className="text-sm">{new Date(p.purchase_date).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium text-sm">{p.reference_number || "—"}</TableCell>
                      <TableCell className="text-sm">{p.suppliers?.name || "—"}</TableCell>
                      <TableCell>{statusBadge(p.status)}</TableCell>
                      <TableCell>{paymentBadge(p.payment_status)}</TableCell>
                      <TableCell className="text-right font-medium">৳{Number(p.total_amount).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm">
                        {p.payment_status === "paid" ? "৳0" : `৳${Number(p.total_amount).toLocaleString()}`}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              {!isLoading && filtered.length > 0 && (
                <TableFooter>
                  <TableRow className="bg-muted/70 font-semibold">
                    <TableCell colSpan={4} className="text-center font-bold">Total:</TableCell>
                    <TableCell colSpan={1} className="text-xs">
                      {partialCount > 0 && <div>Partial - {partialCount}</div>}
                      {dueCount > 0 && <div>Due - {dueCount}</div>}
                      {paidCount > 0 && <div>Paid - {paidCount}</div>}
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right font-bold">৳{totalAmount.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-bold text-destructive">৳{paymentDue.toLocaleString()}</TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>

          {/* Footer info */}
          <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
            <span>Showing 1 to {Math.min(Number(perPage), filtered.length)} of {filtered.length} entries</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

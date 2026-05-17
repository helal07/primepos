import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowLeft, Pencil, Printer, MessageCircle } from "lucide-react";
import { useSale, useSaleItems, useSalePayments } from "@/hooks/useSales";
import { useSettings } from "@/hooks/useSettings";
import { SaleInvoice } from "@/components/sales/SaleInvoice";
import { buildSaleWhatsappUrl } from "@/lib/whatsappShare";
import { useToast } from "@/hooks/use-toast";
import { computeSaleTotals } from "@/lib/saleTotals";

const statusColors: Record<string, string> = {
  completed: "bg-green-100 text-green-800",
  draft: "bg-gray-100 text-gray-800",
  returned: "bg-red-100 text-red-800",
};

export default function SaleView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: sale, isLoading } = useSale(id || null);
  const { data: items, isLoading: itemsLoading } = useSaleItems(id || null);
  const { data: payments } = useSalePayments(id || null);
  const { data: settings } = useSettings();
  const [showInvoice, setShowInvoice] = useState(false);
  const { toast } = useToast();

  if (isLoading) {
    return <div className="space-y-4 p-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  }

  if (!sale) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Sale not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/sales")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Sales
        </Button>
      </div>
    );
  }

  const totals = computeSaleTotals(sale, payments ?? []);

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Sale: ${sale.invoice_number}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/sales")}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/sales/${id}/edit`)}>
              <Pencil className="h-4 w-4 mr-2" /> Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-emerald-600 border-emerald-600/40 hover:bg-emerald-50"
              onClick={() => {
                const phone = (sale as any).customers?.phone || "";
                if (!phone.replace(/\D/g, "")) {
                  toast({ title: "Customer phone missing", description: "Add a phone number to send via WhatsApp.", variant: "destructive" });
                  return;
                }
                const url = buildSaleWhatsappUrl({ sale, payments: payments ?? [], settings: settings ?? {} });
                window.open(url, "_blank", "noopener,noreferrer");
              }}
            >
              <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
            </Button>
            <Button size="sm" onClick={() => setShowInvoice(true)}>
              <Printer className="h-4 w-4 mr-2" /> Print Invoice
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Sale Details</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Invoice</span><span className="font-medium">{sale.invoice_number}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{new Date(sale.sale_date).toLocaleDateString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge variant="secondary" className={statusColors[sale.status] || ""}>{sale.status}</Badge></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><Badge variant={sale.payment_status === "paid" ? "default" : "outline"}>{sale.payment_status}</Badge></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span>{sale.payment_method || "—"}</span></div>
            {sale.notes && <div className="pt-2 border-t"><span className="text-muted-foreground">Notes:</span> {sale.notes}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Customer</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{(sale as any).customers?.name || "Walk-in"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{(sale as any).customers?.phone || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{(sale as any).customers?.email || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Address</span><span>{(sale as any).customers?.address || "—"}</span></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Items</CardTitle></CardHeader>
        <CardContent>
          {itemsLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Serial/IMEI</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Disc %</TableHead>
                  <TableHead className="text-right">Tax %</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(items ?? []).map((item: any, idx: number) => (
                  <TableRow key={item.id}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell className="font-medium">{item.products?.name || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{item.serial_number || "—"}</TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">৳{Number(item.unit_price).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{item.discount}%</TableCell>
                    <TableCell className="text-right">{item.tax_percent}%</TableCell>
                    <TableCell className="text-right font-medium">৳{Number(item.total).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      {payments && payments.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Payment History</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p: any, idx: number) => (
                  <TableRow key={p.id}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell className="capitalize">{p.payment_method}</TableCell>
                    <TableCell className="text-right font-medium">৳{Number(p.amount).toLocaleString()}</TableCell>
                    <TableCell className="text-muted-foreground">{p.payment_note || "—"}</TableCell>
                    <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-end space-y-1 text-sm">
            <div className="flex justify-between w-64"><span className="text-muted-foreground">Subtotal</span><span>৳{Number(sale.subtotal).toLocaleString()}</span></div>
            <div className="flex justify-between w-64"><span className="text-muted-foreground">Discount</span><span>-৳{Number(sale.discount_amount).toLocaleString()}</span></div>
            <div className="flex justify-between w-64"><span className="text-muted-foreground">Tax</span><span>+৳{Number(sale.tax_amount).toLocaleString()}</span></div>
            {Number(sale.shipping_cost) > 0 && (
              <div className="flex justify-between w-64"><span className="text-muted-foreground">Shipping</span><span>+৳{Number(sale.shipping_cost).toLocaleString()}</span></div>
            )}
            <div className="flex justify-between w-64 border-t pt-1 font-bold text-base"><span>Grand Total</span><span>৳{Number(sale.total_amount).toLocaleString()}</span></div>
            <div className="flex justify-between w-64 pt-1"><span className="text-muted-foreground">Paid</span><span>৳{totals.paid.toLocaleString()}</span></div>
            {totals.balance > 0 ? (
              <div className="flex justify-between w-64 font-semibold text-destructive"><span>Balance Due</span><span>৳{totals.balance.toLocaleString()}</span></div>
            ) : totals.balance < 0 ? (
              <div className="flex justify-between w-64 font-semibold text-emerald-600"><span>Advance</span><span>৳{Math.abs(totals.balance).toLocaleString()}</span></div>
            ) : (
              <div className="flex justify-between w-64 font-semibold text-emerald-600"><span>Paid in full</span><span>৳0</span></div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invoice Dialog */}
      <Dialog open={showInvoice} onOpenChange={setShowInvoice}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <SaleInvoice sale={sale} items={items ?? []} payments={payments ?? []} settings={settings ?? {}} onPrint={() => {
            const printArea = document.getElementById("invoice-print-area");
            if (printArea) {
              const w = window.open("", "_blank");
              if (w) {
                w.document.write(`<html><head><title>Invoice ${sale.invoice_number}</title><style>
                  body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
                  table { width: 100%; border-collapse: collapse; }
                  th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
                  th { background: #f9fafb; font-weight: 600; }
                  .text-right { text-align: right; }
                  .text-center { text-align: center; }
                  .font-bold { font-weight: bold; }
                  .border-t { border-top: 2px solid #333; }
                  .text-sm { font-size: 13px; }
                  .text-xs { font-size: 11px; }
                  .mb-4 { margin-bottom: 16px; }
                  .mt-4 { margin-top: 16px; }
                  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                  h1 { font-size: 24px; margin: 0; }
                  h2 { font-size: 14px; margin: 0 0 4px; color: #666; }
                </style></head><body>`);
                w.document.write(printArea.innerHTML);
                w.document.write("</body></html>");
                w.document.close();
                w.print();
              }
            }
          }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

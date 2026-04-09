import { useParams, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Pencil, Printer } from "lucide-react";
import { usePurchase, usePurchaseItems } from "@/hooks/usePurchases";

const statusVariant = (s: string) => {
  switch (s) {
    case "received": return "default";
    case "partial": return "secondary";
    case "cancelled": return "destructive";
    default: return "outline";
  }
};

export default function PurchaseView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: purchase, isLoading } = usePurchase(id || null);
  const { data: items, isLoading: itemsLoading } = usePurchaseItems(id || null);

  if (isLoading) {
    return <div className="space-y-4 p-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  }

  if (!purchase) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Purchase not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/purchases")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Purchases
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 print-area">
      <PageHeader
        title={`Purchase: ${purchase.reference_number || "—"}`}
        actions={
          <div className="flex gap-2 no-print">
            <Button variant="outline" size="sm" onClick={() => navigate("/purchases")}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/purchases/${id}/edit`)}>
              <Pencil className="h-4 w-4 mr-2" /> Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" /> Print
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Purchase Details</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Reference</span><span className="font-medium">{purchase.reference_number || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{new Date(purchase.purchase_date).toLocaleDateString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge variant={statusVariant(purchase.status)}>{purchase.status}</Badge></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Payment Status</span><Badge variant={purchase.payment_status === "paid" ? "default" : "outline"}>{purchase.payment_status}</Badge></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Payment Method</span><span>{purchase.payment_method || "—"}</span></div>
            {purchase.notes && <div className="pt-2 border-t"><span className="text-muted-foreground">Notes:</span> {purchase.notes}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Supplier</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{(purchase as any).suppliers?.name || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{(purchase as any).suppliers?.phone || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{(purchase as any).suppliers?.email || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Address</span><span>{(purchase as any).suppliers?.address || "—"}</span></div>
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
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
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
                    <TableCell className="text-right">৳{Number(item.unit_cost).toLocaleString()}</TableCell>
                    <TableCell className="text-right">৳{Number(item.discount).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{item.tax_percent}%</TableCell>
                    <TableCell className="text-right font-medium">৳{Number(item.total).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-end space-y-1 text-sm">
            <div className="flex justify-between w-64"><span className="text-muted-foreground">Subtotal</span><span>৳{Number(purchase.subtotal).toLocaleString()}</span></div>
            <div className="flex justify-between w-64"><span className="text-muted-foreground">Discount</span><span>-৳{Number(purchase.discount_amount).toLocaleString()}</span></div>
            <div className="flex justify-between w-64"><span className="text-muted-foreground">Tax</span><span>+৳{Number(purchase.tax_amount).toLocaleString()}</span></div>
            <div className="flex justify-between w-64"><span className="text-muted-foreground">Shipping</span><span>+৳{Number(purchase.shipping_cost).toLocaleString()}</span></div>
            <div className="flex justify-between w-64 border-t pt-1 font-bold text-base"><span>Grand Total</span><span>৳{Number(purchase.total_amount).toLocaleString()}</span></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

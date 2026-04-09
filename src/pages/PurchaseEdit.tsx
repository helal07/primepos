import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { usePurchase, usePurchaseItems } from "@/hooks/usePurchases";

// For now, redirect to purchases list with a toast - full edit form is complex
// This is a simplified version that shows the data and allows basic edits
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { useSuppliers } from "@/hooks/useContacts";
import { usePurchaseMutations, type PurchaseItem } from "@/hooks/usePurchases";
import { toast } from "sonner";

export default function PurchaseEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: purchase, isLoading } = usePurchase(id || null);
  const { data: existingItems, isLoading: itemsLoading } = usePurchaseItems(id || null);
  const { data: suppliers } = useSuppliers();
  const { updatePurchase } = usePurchaseMutations();

  const [supplierId, setSupplierId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [purchaseStatus, setPurchaseStatus] = useState("received");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentStatus, setPaymentStatus] = useState("unpaid");
  const [notes, setNotes] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (purchase && !loaded) {
      setSupplierId(purchase.supplier_id || "");
      setPurchaseDate(purchase.purchase_date || "");
      setReferenceNumber(purchase.reference_number || "");
      setPurchaseStatus(purchase.status || "received");
      setPaymentMethod(purchase.payment_method || "cash");
      setPaymentStatus(purchase.payment_status || "unpaid");
      setNotes(purchase.notes || "");
      setLoaded(true);
    }
  }, [purchase, loaded]);

  if (isLoading || itemsLoading) {
    return <div className="space-y-4 p-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  }

  if (!purchase) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Purchase not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/purchases")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
      </div>
    );
  }

  const items: PurchaseItem[] = (existingItems ?? []).map((item: any) => ({
    product_id: item.product_id,
    variation_id: item.variation_id,
    quantity: item.quantity,
    received_quantity: item.received_quantity,
    unit_cost: Number(item.unit_cost),
    discount: Number(item.discount),
    tax_percent: Number(item.tax_percent),
    total: Number(item.total),
    serial_number: item.serial_number,
  }));

  const handleSubmit = async () => {
    if (!id) return;
    try {
      await updatePurchase.mutateAsync({
        id,
        formData: {
          supplier_id: supplierId || null,
          purchase_date: purchaseDate,
          reference_number: referenceNumber,
          status: purchaseStatus,
          subtotal: Number(purchase.subtotal),
          discount_amount: Number(purchase.discount_amount),
          tax_amount: Number(purchase.tax_amount),
          shipping_cost: Number(purchase.shipping_cost),
          total_amount: Number(purchase.total_amount),
          payment_status: paymentStatus,
          payment_method: paymentMethod,
          notes,
          items,
        },
      });
      navigate(`/purchases/${id}`);
    } catch (e) {
      // error handled by mutation
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title={`Edit Purchase: ${referenceNumber}`} actions={
        <Button variant="outline" onClick={() => navigate(`/purchases/${id}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
      } />

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Reference No</Label>
              <Input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} />
            </div>
            <div>
              <Label>Supplier</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {(suppliers ?? []).map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Purchase Date</Label>
              <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={purchaseStatus} onValueChange={setPurchaseStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="ordered">Ordered</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment Status</Label>
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={1} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="font-medium mb-3">Items (read-only)</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Serial</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(existingItems ?? []).map((item: any, idx: number) => (
                <TableRow key={item.id}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>{item.products?.name || "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{item.serial_number || "—"}</TableCell>
                  <TableCell className="text-center">{item.quantity}</TableCell>
                  <TableCell className="text-right">৳{Number(item.unit_cost).toLocaleString()}</TableCell>
                  <TableCell className="text-right font-medium">৳{Number(item.total).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate(`/purchases/${id}`)}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={updatePurchase.isPending}>
          {updatePurchase.isPending ? "Saving..." : "Update Purchase"}
        </Button>
      </div>
    </div>
  );
}

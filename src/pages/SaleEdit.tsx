import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useSale, useSaleItems, useSaleMutations, type SaleItem } from "@/hooks/useSales";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCustomers } from "@/hooks/useContacts";

export default function SaleEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: sale, isLoading } = useSale(id || null);
  const { data: existingItems, isLoading: itemsLoading } = useSaleItems(id || null);
  const { data: customers } = useCustomers();
  const { updateSale } = useSaleMutations();

  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentStatus, setPaymentStatus] = useState("paid");
  const [status, setStatus] = useState("completed");
  const [notes, setNotes] = useState("");
  const [discountType, setDiscountType] = useState("fixed");
  const [discountValue, setDiscountValue] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (sale && !loaded) {
      setCustomerId(sale.customer_id || "");
      setPaymentMethod(sale.payment_method || "cash");
      setPaymentStatus(sale.payment_status || "paid");
      setStatus(sale.status || "completed");
      setNotes(sale.notes || "");
      setDiscountType(sale.discount_type || "fixed");
      setDiscountValue(Number(sale.discount_value) || 0);
      setShippingCost(Number(sale.shipping_cost) || 0);
      setLoaded(true);
    }
  }, [sale, loaded]);

  if (isLoading || itemsLoading) {
    return <div className="space-y-4 p-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  }

  if (!sale) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Sale not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/sales")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
      </div>
    );
  }

  const items: SaleItem[] = (existingItems ?? []).map((item: any) => ({
    product_id: item.product_id,
    variation_id: item.variation_id,
    quantity: item.quantity,
    unit_price: Number(item.unit_price),
    discount: Number(item.discount),
    tax_percent: Number(item.tax_percent),
    total: Number(item.total),
    serial_number: item.serial_number,
  }));

  const handleSubmit = async () => {
    if (!id) return;
    try {
      await updateSale.mutateAsync({
        id,
        formData: {
          customer_id: customerId || null,
          status,
          subtotal: Number(sale.subtotal),
          discount_type: discountType,
          discount_value: discountValue,
          discount_amount: Number(sale.discount_amount),
          tax_amount: Number(sale.tax_amount),
          shipping_cost: shippingCost,
          total_amount: Number(sale.total_amount),
          payment_method: paymentMethod,
          payment_status: paymentStatus,
          notes,
          items,
        },
      });
      navigate(`/sales/${id}`);
    } catch (e) {
      // error handled by mutation
    }
  };

  const customerSelectValue = customerId || "walk-in";

  return (
    <div className="space-y-4">
      <PageHeader title={`Edit Sale: ${sale.invoice_number}`} actions={
        <Button variant="outline" onClick={() => navigate(`/sales/${id}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
      } />

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Customer</Label>
              <Select value={customerSelectValue} onValueChange={(v) => setCustomerId(v === "walk-in" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk-in">Walk-in Customer</SelectItem>
                  {(customers ?? []).map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="returned">Returned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bkash">bKash</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
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
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <Label>Shipping Cost</Label>
              <Input type="number" min={0} value={shippingCost} onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)} />
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
                <TableHead className="text-right">Unit Price</TableHead>
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
                  <TableCell className="text-right">৳{Number(item.unit_price).toLocaleString()}</TableCell>
                  <TableCell className="text-right font-medium">৳{Number(item.total).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-end space-y-1 text-sm">
            <div className="flex justify-between w-64"><span className="text-muted-foreground">Subtotal</span><span>৳{Number(sale.subtotal).toLocaleString()}</span></div>
            <div className="flex justify-between w-64"><span className="text-muted-foreground">Discount</span><span>-৳{Number(sale.discount_amount).toLocaleString()}</span></div>
            <div className="flex justify-between w-64"><span className="text-muted-foreground">Tax</span><span>+৳{Number(sale.tax_amount).toLocaleString()}</span></div>
            <div className="flex justify-between w-64 border-t pt-1 font-bold text-base"><span>Total</span><span>৳{Number(sale.total_amount).toLocaleString()}</span></div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate(`/sales/${id}`)}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={updateSale.isPending}>
          {updateSale.isPending ? "Saving..." : "Update Sale"}
        </Button>
      </div>
    </div>
  );
}

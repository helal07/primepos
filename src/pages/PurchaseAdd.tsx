import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Search, ArrowLeft } from "lucide-react";
import { useProducts } from "@/hooks/useInventory";
import { useSuppliers } from "@/hooks/useContacts";
import { usePurchaseMutations, type PurchaseItem } from "@/hooks/usePurchases";

export default function PurchaseAdd() {
  const navigate = useNavigate();
  const { data: products } = useProducts();
  const { data: suppliers } = useSuppliers();
  const { createPurchase } = usePurchaseMutations();

  const [supplierId, setSupplierId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentStatus, setPaymentStatus] = useState("unpaid");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const filteredProducts = useMemo(() => {
    if (!products || !productSearch) return [];
    const q = productSearch.toLowerCase();
    return products.filter((p: any) =>
      p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [products, productSearch]);

  const addProduct = (product: any) => {
    const exists = items.find((i) => i.product_id === product.id);
    if (exists) {
      setItems(items.map((i) =>
        i.product_id === product.id
          ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unit_cost }
          : i
      ));
    } else {
      setItems([...items, {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_cost: Number(product.purchase_price),
        discount: 0,
        tax_percent: Number(product.tax_percent),
        total: Number(product.purchase_price),
      }]);
    }
    setProductSearch("");
    setShowSearch(false);
  };

  const updateItem = (idx: number, field: string, value: number) => {
    setItems(items.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      const base = updated.quantity * updated.unit_cost;
      const afterDiscount = base - updated.discount;
      updated.total = afterDiscount + afterDiscount * (updated.tax_percent / 100);
      return updated;
    }));
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_cost, 0);
  const totalDiscount = items.reduce((s, i) => s + i.discount, 0);
  const totalTax = items.reduce((s, i) => s + (i.quantity * i.unit_cost - i.discount) * (i.tax_percent / 100), 0);
  const grandTotal = subtotal - totalDiscount + totalTax;

  const handleSubmit = async () => {
    if (items.length === 0) return;
    await createPurchase.mutateAsync({
      supplier_id: supplierId || null,
      purchase_date: purchaseDate,
      reference_number: referenceNumber,
      status: "pending",
      subtotal,
      discount_amount: totalDiscount,
      tax_amount: totalTax,
      shipping_cost: 0,
      total_amount: grandTotal,
      payment_status: paymentStatus,
      payment_method: paymentMethod,
      notes,
      items,
    });
    navigate("/purchases");
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Add Purchase" description="Record a new purchase from supplier">
        <Button variant="outline" onClick={() => navigate("/purchases")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Product Search */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={productSearch}
                  onChange={(e) => { setProductSearch(e.target.value); setShowSearch(true); }}
                  onFocus={() => setShowSearch(true)}
                  className="pl-9"
                />
                {showSearch && filteredProducts.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-popover border rounded-md shadow-md max-h-48 overflow-auto">
                    {filteredProducts.map((p: any) => (
                      <button key={p.id} className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex justify-between" onClick={() => addProduct(p)}>
                        <span>{p.name}</span>
                        <span className="text-muted-foreground">৳{Number(p.purchase_price).toLocaleString()}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {items.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="w-20">Qty</TableHead>
                      <TableHead className="w-28">Unit Cost</TableHead>
                      <TableHead className="w-24">Discount</TableHead>
                      <TableHead className="w-20">Tax %</TableHead>
                      <TableHead className="w-28 text-right">Total</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{item.product_name}</TableCell>
                        <TableCell>
                          <Input type="number" min={1} value={item.quantity} onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)} className="h-8 w-16" />
                        </TableCell>
                        <TableCell>
                          <Input type="number" min={0} value={item.unit_cost} onChange={(e) => updateItem(idx, "unit_cost", parseFloat(e.target.value) || 0)} className="h-8 w-24" />
                        </TableCell>
                        <TableCell>
                          <Input type="number" min={0} value={item.discount} onChange={(e) => updateItem(idx, "discount", parseFloat(e.target.value) || 0)} className="h-8 w-20" />
                        </TableCell>
                        <TableCell>
                          <Input type="number" min={0} value={item.tax_percent} onChange={(e) => updateItem(idx, "tax_percent", parseFloat(e.target.value) || 0)} className="h-8 w-16" />
                        </TableCell>
                        <TableCell className="text-right font-medium">৳{item.total.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(idx)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Purchase Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
                <Label>Reference #</Label>
                <Input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} placeholder="PO-001" />
              </div>
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
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>৳{subtotal.toFixed(2)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span>-৳{totalDiscount.toFixed(2)}</span>
                </div>
              )}
              {totalTax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>+৳{totalTax.toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">৳{grandTotal.toFixed(2)}</span>
              </div>
              <Button className="w-full" size="lg" disabled={items.length === 0 || createPurchase.isPending} onClick={handleSubmit}>
                {createPurchase.isPending ? "Saving..." : "Save Purchase"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

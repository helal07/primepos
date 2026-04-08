import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Search, Save, ArrowLeft } from "lucide-react";
import { useProducts } from "@/hooks/useInventory";
import { useCustomers } from "@/hooks/useContacts";
import { useSaleMutations, type SaleItem } from "@/hooks/useSales";

export default function SaleAdd() {
  const navigate = useNavigate();
  const { data: products } = useProducts();
  const { data: customers } = useCustomers();
  const { createSale } = useSaleMutations();

  const [customerId, setCustomerId] = useState<string>("");
  const customerSelectValue = customerId || "walk-in";
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [discountType, setDiscountType] = useState("fixed");
  const [discountValue, setDiscountValue] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);
  const [notes, setNotes] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [items, setItems] = useState<SaleItem[]>([]);

  const filteredProducts = useMemo(() => {
    if (!productSearch || !products) return [];
    const q = productSearch.toLowerCase();
    return products
      .filter(
        (p: any) =>
          p.name.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.barcode?.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [productSearch, products]);

  const addProduct = (product: any) => {
    const exists = items.find((i) => i.product_id === product.id);
    if (exists) {
      setItems(
        items.map((i) =>
          i.product_id === product.id
            ? {
                ...i,
                quantity: i.quantity + 1,
                total: (i.quantity + 1) * i.unit_price * (1 - i.discount / 100) * (1 + i.tax_percent / 100),
              }
            : i
        )
      );
    } else {
      const price = Number(product.selling_price);
      const tax = Number(product.tax_percent);
      setItems([
        ...items,
        {
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          unit_price: price,
          discount: 0,
          tax_percent: tax,
          total: price * (1 + tax / 100),
        },
      ]);
    }
    setProductSearch("");
  };

  const updateItem = (index: number, field: keyof SaleItem, value: any) => {
    setItems(
      items.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };
        const qty = Number(updated.quantity);
        const price = Number(updated.unit_price);
        const disc = Number(updated.discount);
        const tax = Number(updated.tax_percent);
        updated.total = qty * price * (1 - disc / 100) * (1 + tax / 100);
        return updated;
      })
    );
  };

  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const subtotal = items.reduce(
    (sum, i) => sum + Number(i.quantity) * Number(i.unit_price),
    0
  );
  const itemDiscountTotal = items.reduce(
    (sum, i) =>
      sum +
      Number(i.quantity) * Number(i.unit_price) * (Number(i.discount) / 100),
    0
  );
  const discountAmount =
    discountType === "percentage"
      ? (subtotal - itemDiscountTotal) * (discountValue / 100)
      : discountValue;
  const afterDiscount = subtotal - itemDiscountTotal - discountAmount;
  const taxAmount = items.reduce(
    (sum, i) =>
      sum +
      Number(i.quantity) *
        Number(i.unit_price) *
        (1 - Number(i.discount) / 100) *
        (Number(i.tax_percent) / 100),
    0
  );
  const totalAmount = afterDiscount + taxAmount + shippingCost;

  const handleSubmit = async (status: string = "completed") => {
    if (items.length === 0) return;
    await createSale.mutateAsync({
      customer_id: customerId || null,
      status,
      subtotal,
      discount_type: discountType,
      discount_value: discountValue,
      discount_amount: discountAmount + itemDiscountTotal,
      tax_amount: taxAmount,
      shipping_cost: shippingCost,
      total_amount: totalAmount,
      payment_method: paymentMethod,
      payment_status: status === "draft" ? "unpaid" : "paid",
      notes: notes || undefined,
      items,
    });
    navigate("/sales");
  };

  return (
    <div>
      <PageHeader
        title="New Sale"
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate("/sales")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Items */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Add Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, SKU, or barcode..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-9"
                />
                {filteredProducts.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredProducts.map((p: any) => (
                      <button
                        key={p.id}
                        className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex justify-between"
                        onClick={() => addProduct(p)}
                      >
                        <span>{p.name}</span>
                        <span className="text-muted-foreground">
                          ৳{Number(p.selling_price).toLocaleString()} | Stock:{" "}
                          {p.stock_quantity}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Search and add products to the sale
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="w-20">Qty</TableHead>
                        <TableHead className="w-24">Price</TableHead>
                        <TableHead className="w-20 hidden sm:table-cell">Disc%</TableHead>
                        <TableHead className="w-20 hidden sm:table-cell">Tax%</TableHead>
                        <TableHead className="w-24 text-right">Total</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium text-sm">
                            {item.product_name}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) =>
                                updateItem(idx, "quantity", parseInt(e.target.value) || 1)
                              }
                              className="h-8 w-16"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              value={item.unit_price}
                              onChange={(e) =>
                                updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)
                              }
                              className="h-8 w-20"
                            />
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={item.discount}
                              onChange={(e) =>
                                updateItem(idx, "discount", parseFloat(e.target.value) || 0)
                              }
                              className="h-8 w-16"
                            />
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Input
                              type="number"
                              min={0}
                              value={item.tax_percent}
                              onChange={(e) =>
                                updateItem(idx, "tax_percent", parseFloat(e.target.value) || 0)
                              }
                              className="h-8 w-16"
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ৳{item.total.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => removeItem(idx)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Summary */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={customerSelectValue}
                onValueChange={(value) => setCustomerId(value === "walk-in" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Walk-in Customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk-in">Walk-in Customer</SelectItem>
                  {(customers ?? []).map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="bkash">bKash</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-xs">Discount</Label>
                  <Input
                    type="number"
                    min={0}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="w-24">
                  <Label className="text-xs">Type</Label>
                  <Select value={discountType} onValueChange={setDiscountType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">৳</SelectItem>
                      <SelectItem value="percentage">%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Shipping</Label>
                <Input
                  type="number"
                  min={0}
                  value={shippingCost}
                  onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label className="text-xs">Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>৳{subtotal.toFixed(2)}</span>
              </div>
              {itemDiscountTotal > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Item Discounts</span>
                  <span>-৳{itemDiscountTotal.toFixed(2)}</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>
                    Order Discount{" "}
                    {discountType === "percentage" ? `(${discountValue}%)` : ""}
                  </span>
                  <span>-৳{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Tax</span>
                <span>+৳{taxAmount.toFixed(2)}</span>
              </div>
              {shippingCost > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Shipping</span>
                  <span>+৳{shippingCost.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>৳{totalAmount.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => handleSubmit("draft")}
              disabled={items.length === 0 || createSale.isPending}
            >
              Save Draft
            </Button>
            <Button
              className="flex-1"
              onClick={() => handleSubmit("completed")}
              disabled={items.length === 0 || createSale.isPending}
            >
              <Save className="h-4 w-4 mr-1" /> Complete Sale
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

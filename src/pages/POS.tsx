import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  X,
  ShoppingCart,
  ArrowLeft,
  CreditCard,
  Banknote,
  Smartphone,
  Receipt,
  Percent,
} from "lucide-react";
import { useProducts } from "@/hooks/useInventory";
import { useCustomers } from "@/hooks/useContacts";
import { useSaleMutations, type SaleItem } from "@/hooks/useSales";

export default function POS() {
  const navigate = useNavigate();
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: customers } = useCustomers();
  const { createSale } = useSaleMutations();

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [customerId, setCustomerId] = useState("");
  const customerSelectValue = customerId || "walk-in";
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState("fixed");
  const [showPayment, setShowPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<string>("");

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    const q = search.toLowerCase();
    if (!q) return products;
    return products.filter(
      (p: any) =>
        p.name.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q)
    );
  }, [search, products]);

  const addToCart = (product: any) => {
    const exists = cart.find((i) => i.product_id === product.id);
    if (exists) {
      setCart(
        cart.map((i) =>
          i.product_id === product.id
            ? {
                ...i,
                quantity: i.quantity + 1,
                total:
                  (i.quantity + 1) *
                  i.unit_price *
                  (1 + i.tax_percent / 100),
              }
            : i
        )
      );
    } else {
      const price = Number(product.selling_price);
      const tax = Number(product.tax_percent);
      setCart([
        ...cart,
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
  };

  const updateQty = (index: number, delta: number) => {
    setCart(
      cart
        .map((item, i) => {
          if (i !== index) return item;
          const qty = Math.max(0, item.quantity + delta);
          return { ...item, quantity: qty, total: qty * item.unit_price * (1 + item.tax_percent / 100) };
        })
        .filter((i) => i.quantity > 0)
    );
  };

  const removeItem = (index: number) => setCart(cart.filter((_, i) => i !== index));

  const subtotal = cart.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const taxAmount = cart.reduce(
    (s, i) => s + i.quantity * i.unit_price * (i.tax_percent / 100),
    0
  );
  const discountAmount =
    discountType === "percentage"
      ? subtotal * (discountValue / 100)
      : discountValue;
  const totalAmount = subtotal - discountAmount + taxAmount;

  const handleComplete = async () => {
    if (cart.length === 0) return;
    const result = await createSale.mutateAsync({
      customer_id: customerId || null,
      status: "completed",
      subtotal,
      discount_type: discountType,
      discount_value: discountValue,
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      shipping_cost: 0,
      total_amount: totalAmount,
      payment_method: paymentMethod,
      payment_status: "paid",
      items: cart,
    });
    setLastInvoice(result.invoice_number);
    setShowPayment(false);
    setShowReceipt(true);
  };

  const handleNewSale = () => {
    setCart([]);
    setCustomerId("");
    setDiscountValue(0);
    setPaymentMethod("cash");
    setShowReceipt(false);
    setLastInvoice("");
  };

  return (
    <div className="h-[calc(100vh-4rem)] -m-4 flex flex-col bg-background">
      {/* Header */}
      <div className="h-14 border-b flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">POS Terminal</h1>
        </div>
        <div className="flex items-center gap-2">
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Walk-in Customer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Walk-in Customer</SelectItem>
              {(customers ?? []).map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        {/* Products Grid */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products by name, SKU, barcode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
          </div>
          <ScrollArea className="flex-1 p-3">
            {productsLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading products...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No products found</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {filteredProducts.map((product: any) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="text-left p-3 rounded-lg border bg-card hover:bg-accent hover:border-primary/30 transition-all group"
                  >
                    <div className="text-sm font-medium line-clamp-2 group-hover:text-primary">
                      {product.name}
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-sm font-bold text-primary">
                        ৳{Number(product.selling_price).toLocaleString()}
                      </span>
                      <Badge variant="outline" className="text-[10px] h-5">
                        {product.stock_quantity}
                      </Badge>
                    </div>
                    {product.sku && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">{product.sku}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Cart Panel */}
        <div className="w-[340px] border-l flex flex-col bg-muted/30 hidden md:flex">
          <div className="p-3 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              <span className="font-semibold text-sm">Cart ({cart.length})</span>
            </div>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" className="text-destructive h-7 text-xs" onClick={() => setCart([])}>
                Clear
              </Button>
            )}
          </div>

          <ScrollArea className="flex-1">
            {cart.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Cart is empty
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {cart.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2 rounded-md bg-background border text-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.product_name}</div>
                      <div className="text-xs text-muted-foreground">
                        ৳{item.unit_price.toLocaleString()} × {item.quantity}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => updateQty(idx, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-xs font-medium">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => updateQty(idx, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="w-16 text-right font-medium text-xs">
                      ৳{item.total.toFixed(0)}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive shrink-0"
                      onClick={() => removeItem(idx)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Cart Footer */}
          <div className="border-t p-3 space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Percent className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  type="number"
                  min={0}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  className="h-8 pl-7 text-xs"
                  placeholder="Discount"
                />
              </div>
              <Select value={discountType} onValueChange={setDiscountType}>
                <SelectTrigger className="w-16 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">৳</SelectItem>
                  <SelectItem value="percentage">%</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>৳{subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount</span>
                  <span>-৳{discountAmount.toFixed(2)}</span>
                </div>
              )}
              {taxAmount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax</span>
                  <span>+৳{taxAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-1 border-t">
                <span>Total</span>
                <span className="text-primary">৳{totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              disabled={cart.length === 0}
              onClick={() => setShowPayment(true)}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Pay ৳{totalAmount.toFixed(2)}
            </Button>
          </div>
        </div>

        {/* Mobile Cart FAB */}
        {cart.length > 0 && (
          <div className="md:hidden fixed bottom-4 left-4 right-4 z-50">
            <Button className="w-full" size="lg" onClick={() => setShowPayment(true)}>
              <ShoppingCart className="h-4 w-4 mr-2" />
              {cart.length} items — ৳{totalAmount.toFixed(2)}
            </Button>
          </div>
        )}
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">৳{totalAmount.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground mt-1">{cart.length} items</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "cash", label: "Cash", icon: Banknote },
                { value: "card", label: "Card", icon: CreditCard },
                { value: "bkash", label: "bKash", icon: Smartphone },
                { value: "bank", label: "Bank", icon: CreditCard },
              ].map((m) => (
                <Button
                  key={m.value}
                  variant={paymentMethod === m.value ? "default" : "outline"}
                  className="h-16 flex-col gap-1"
                  onClick={() => setPaymentMethod(m.value)}
                >
                  <m.icon className="h-5 w-5" />
                  <span className="text-xs">{m.label}</span>
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayment(false)}>
              Cancel
            </Button>
            <Button onClick={handleComplete} disabled={createSale.isPending}>
              {createSale.isPending ? "Processing..." : "Complete Sale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">Sale Complete!</DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-3">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <Receipt className="h-8 w-8 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-primary">৳{totalAmount.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">Invoice: {lastInvoice}</div>
            <div className="text-sm text-muted-foreground capitalize">
              Paid via {paymentMethod}
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button className="w-full" onClick={handleNewSale}>
              <Plus className="h-4 w-4 mr-2" /> New Sale
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate("/sales")}>
              View Sales
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

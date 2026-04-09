import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ScanBarcode,
  ChevronDown,
} from "lucide-react";
import { lazy, Suspense } from "react";

const BarcodeScanner = lazy(() => import("@/components/pos/BarcodeScanner"));
import { useProducts, useCategories, useBrands } from "@/hooks/useInventory";
import { useCustomers } from "@/hooks/useContacts";
import { useSaleMutations, type SaleItem } from "@/hooks/useSales";
import { PaymentDialog, type PaymentRow } from "@/components/payments/PaymentDialog";
import { useAvailableSerials } from "@/hooks/useAvailableSerials";

// Extended cart item with serial tracking
interface CartItem extends SaleItem {
  serial_tracking?: boolean;
  selected_serials?: string[];
}

export default function POS() {
  const navigate = useNavigate();
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: categories } = useCategories();
  const { data: brands } = useBrands();
  const { data: customers } = useCustomers();
  const { createSale, createSalePayments } = useSaleMutations();

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState("");
  const customerSelectValue = customerId || "walk-in";
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState("fixed");
  const [showPayment, setShowPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastInvoice, setLastInvoice] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);

  // Filter state
  const [filterType, setFilterType] = useState<"all" | "category" | "brand">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");

  // IMEI selector state
  const [imeiProductId, setImeiProductId] = useState<string | null>(null);
  const { data: availableSerials } = useAvailableSerials(imeiProductId);

  const handleBarcodeScan = (code: string) => {
    setShowScanner(false);
    if (!products) return;
    const q = code.toLowerCase();
    const match = products.find(
      (p: any) =>
        p.barcode?.toLowerCase() === q ||
        p.sku?.toLowerCase() === q ||
        p.name.toLowerCase() === q
    );
    if (match) {
      addToCart(match);
      import("sonner").then(({ toast }) => toast.success(`Added: ${match.name}`));
    } else {
      setSearch(code);
      import("sonner").then(({ toast }) => toast.error("Product not found"));
    }
  };

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    let filtered = products as any[];

    // Text search
    const q = search.toLowerCase();
    if (q) {
      filtered = filtered.filter(
        (p: any) =>
          p.name.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.barcode?.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (filterType === "category" && selectedCategory !== "all") {
      filtered = filtered.filter((p: any) => p.category_id === selectedCategory);
    }

    // Brand filter
    if (filterType === "brand" && selectedBrand !== "all") {
      filtered = filtered.filter((p: any) => p.brand_id === selectedBrand);
    }

    return filtered;
  }, [search, products, filterType, selectedCategory, selectedBrand]);

  const addToCart = useCallback((product: any) => {
    const isSerial = product.serial_tracking || product.product_type === "imei" || product.product_type === "serial";

    if (isSerial) {
      // For serial products, open IMEI selector
      setImeiProductId(product.id);
      return;
    }

    setCart((prev) => {
      const exists = prev.find((i) => i.product_id === product.id);
      if (exists) {
        return prev.map((i) =>
          i.product_id === product.id
            ? {
                ...i,
                quantity: i.quantity + 1,
                total: (i.quantity + 1) * i.unit_price * (1 + i.tax_percent / 100),
              }
            : i
        );
      }
      const price = Number(product.selling_price);
      const tax = Number(product.tax_percent);
      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          unit_price: price,
          discount: 0,
          tax_percent: tax,
          total: price * (1 + tax / 100),
          serial_tracking: false,
        },
      ];
    });
  }, []);

  const addSerialToCart = (productId: string, serial: string) => {
    const product = (products as any[])?.find((p: any) => p.id === productId);
    if (!product) return;

    setCart((prev) => {
      const exists = prev.find((i) => i.product_id === productId && i.serial_tracking);
      if (exists) {
        // Add serial to existing cart item, increase qty
        const updatedSerials = [...(exists.selected_serials || []), serial];
        return prev.map((i) =>
          i.product_id === productId && i.serial_tracking
            ? {
                ...i,
                quantity: updatedSerials.length,
                selected_serials: updatedSerials,
                total: updatedSerials.length * i.unit_price * (1 + i.tax_percent / 100),
              }
            : i
        );
      }
      const price = Number(product.selling_price);
      const tax = Number(product.tax_percent);
      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          unit_price: price,
          discount: 0,
          tax_percent: tax,
          total: price * (1 + tax / 100),
          serial_tracking: true,
          selected_serials: [serial],
        },
      ];
    });
  };

  const removeSerialFromCart = (productId: string, serial: string) => {
    setCart((prev) => {
      return prev
        .map((i) => {
          if (i.product_id !== productId || !i.serial_tracking) return i;
          const updated = (i.selected_serials || []).filter((s) => s !== serial);
          if (updated.length === 0) return null;
          return {
            ...i,
            quantity: updated.length,
            selected_serials: updated,
            total: updated.length * i.unit_price * (1 + i.tax_percent / 100),
          };
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const updateQty = (index: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item, i) => {
          if (i !== index) return item;
          if (item.serial_tracking) return item; // Can't change qty for serial items
          const qty = Math.max(0, item.quantity + delta);
          return { ...item, quantity: qty, total: qty * item.unit_price * (1 + item.tax_percent / 100) };
        })
        .filter((i) => i.quantity > 0)
    );
  };

  const removeItem = (index: number) => setCart(cart.filter((_, i) => i !== index));

  const subtotal = cart.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const taxAmount = cart.reduce((s, i) => s + i.quantity * i.unit_price * (i.tax_percent / 100), 0);
  const discountAmount = discountType === "percentage" ? subtotal * (discountValue / 100) : discountValue;
  const totalAmount = subtotal - discountAmount + taxAmount;

  const handleCompleteWithPayments = async (payments: PaymentRow[], paymentStatus: string) => {
    if (cart.length === 0) return;

    const expandedItems: SaleItem[] = [];
    for (const item of cart) {
      if (item.serial_tracking && item.selected_serials?.length) {
        for (const sn of item.selected_serials) {
          expandedItems.push({
            product_id: item.product_id, quantity: 1, unit_price: item.unit_price,
            discount: item.discount, tax_percent: item.tax_percent,
            total: item.unit_price * (1 + item.tax_percent / 100), serial_number: sn,
          });
        }
      } else {
        expandedItems.push({
          product_id: item.product_id, quantity: item.quantity, unit_price: item.unit_price,
          discount: item.discount, tax_percent: item.tax_percent, total: item.total,
        });
      }
    }

    const result = await createSale.mutateAsync({
      customer_id: customerId || null, status: "completed", subtotal,
      discount_type: discountType, discount_value: discountValue,
      discount_amount: discountAmount, tax_amount: taxAmount, shipping_cost: 0,
      total_amount: totalAmount, payment_method: payments[0]?.payment_method || "cash",
      payment_status: paymentStatus, items: expandedItems,
    });
    await createSalePayments.mutateAsync({ saleId: result.id, payments });
    setLastInvoice(result.invoice_number);
    setShowPayment(false);
    setShowMobileCart(false);
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

  // Get the serial product being selected
  const imeiProduct = useMemo(() => {
    if (!imeiProductId || !products) return null;
    return (products as any[]).find((p: any) => p.id === imeiProductId);
  }, [imeiProductId, products]);

  // Already selected serials for this product
  const alreadySelectedSerials = useMemo(() => {
    if (!imeiProductId) return new Set<string>();
    const item = cart.find((i) => i.product_id === imeiProductId && i.serial_tracking);
    return new Set(item?.selected_serials || []);
  }, [imeiProductId, cart]);

  // Cart items renderer
  const CartItems = () => (
    <>
      {cart.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Cart is empty</div>
      ) : (
        <div className="space-y-1.5">
          {cart.map((item, idx) => (
            <div key={idx} className="p-2.5 rounded-lg bg-card border shadow-sm">
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{item.product_name}</div>
                  <div className="text-xs text-muted-foreground">
                    ৳{item.unit_price.toLocaleString()} × {item.quantity}
                  </div>
                </div>
                {!item.serial_tracking && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="outline" size="icon" className="h-7 w-7 rounded-full" onClick={() => updateQty(idx, -1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-7 text-center text-sm font-semibold">{item.quantity}</span>
                    <Button variant="outline" size="icon" className="h-7 w-7 rounded-full" onClick={() => updateQty(idx, 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                {item.serial_tracking && (
                  <Badge variant="secondary" className="text-[10px]">
                    {item.quantity} IMEI
                  </Badge>
                )}
                <div className="w-16 text-right font-semibold text-sm">৳{item.total.toFixed(0)}</div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => removeItem(idx)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              {/* Show selected serials inline */}
              {item.serial_tracking && item.selected_serials && item.selected_serials.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {item.selected_serials.map((sn) => (
                    <Badge key={sn} variant="outline" className="text-[10px] gap-1 pr-1">
                      {sn}
                      <button
                        onClick={() => removeSerialFromCart(item.product_id, sn)}
                        className="ml-0.5 hover:text-destructive"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );

  // Cart footer
  const CartFooter = () => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Percent className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="number"
            min={0}
            value={discountValue}
            onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
            className="h-9 pl-8 text-sm"
            placeholder="Discount"
          />
        </div>
        <Select value={discountType} onValueChange={setDiscountType}>
          <SelectTrigger className="w-16 h-9 text-sm">
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
        <div className="flex justify-between font-bold text-lg pt-2 border-t">
          <span>Total</span>
          <span className="text-primary">৳{totalAmount.toFixed(2)}</span>
        </div>
      </div>

      <Button className="w-full h-12 text-base font-semibold" disabled={cart.length === 0} onClick={() => setShowPayment(true)}>
        <CreditCard className="h-5 w-5 mr-2" />
        Pay ৳{totalAmount.toFixed(2)}
      </Button>
    </div>
  );

  return (
    <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)] -m-4 flex flex-col bg-background pb-16 md:pb-0">
      {/* Header */}
      <div className="h-12 border-b flex items-center justify-between px-3 shrink-0 bg-card">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-sm md:text-base font-bold">POS</h1>
        </div>
        <Select
          value={customerSelectValue}
          onValueChange={(value) => setCustomerId(value === "walk-in" ? "" : value)}
        >
          <SelectTrigger className="w-[130px] md:w-[160px] h-8 text-xs">
            <SelectValue placeholder="Walk-in" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="walk-in">Walk-in Customer</SelectItem>
            {(customers ?? []).map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Product Grid (right on desktop, full on mobile) */}
        <div className="flex-1 flex flex-col overflow-hidden order-2 md:order-1">
          {/* Search + Scan */}
          <div className="p-2 border-b bg-card/50">
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search product, SKU, barcode..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9 text-sm"
                  autoFocus
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => setShowScanner(true)}
              >
                <ScanBarcode className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Category / Brand Tabs */}
          <div className="px-2 py-1.5 border-b bg-muted/30 overflow-x-auto">
            <div className="flex gap-1.5 items-center">
              <button
                onClick={() => { setFilterType("all"); setSelectedCategory("all"); setSelectedBrand("all"); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  filterType === "all" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
                }`}
              >
                All
              </button>
              {(categories ?? []).slice(0, 8).map((cat: any) => (
                <button
                  key={cat.id}
                  onClick={() => { setFilterType("category"); setSelectedCategory(cat.id); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    filterType === "category" && selectedCategory === cat.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
              <div className="w-px h-5 bg-border mx-1" />
              {(brands ?? []).slice(0, 6).map((brand: any) => (
                <button
                  key={brand.id}
                  onClick={() => { setFilterType("brand"); setSelectedBrand(brand.id); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    filterType === "brand" && selectedBrand === brand.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  {brand.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <ScrollArea className="flex-1 p-2">
            {productsLoading ? (
              <div className="text-center py-12 text-muted-foreground text-sm">Loading...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No products found</div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5">
                {filteredProducts.map((product: any) => {
                  const isSerial = product.serial_tracking || product.product_type === "imei" || product.product_type === "serial";
                  return (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="text-left p-2 rounded-lg border bg-card hover:bg-accent hover:border-primary/30 transition-all active:scale-[0.97] shadow-sm"
                    >
                      {product.image_url ? (
                        <div className="w-full aspect-square rounded-md bg-muted mb-1.5 overflow-hidden">
                          <img src={product.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      ) : (
                        <div className="w-full aspect-square rounded-md bg-muted mb-1.5 flex items-center justify-center">
                          <span className="text-2xl text-muted-foreground/30">📦</span>
                        </div>
                      )}
                      <div className="text-xs font-medium line-clamp-2 leading-tight min-h-[2rem]">
                        {product.name}
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-xs font-bold text-primary">
                          ৳{Number(product.selling_price).toLocaleString()}
                        </span>
                        <div className="flex items-center gap-1">
                          {isSerial && (
                            <Badge variant="secondary" className="text-[8px] h-4 px-1">IMEI</Badge>
                          )}
                          <Badge variant="outline" className="text-[9px] h-4 px-1 rounded-full">
                            {product.stock_quantity}
                          </Badge>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Desktop Cart Panel */}
        <div className="w-[320px] border-l flex flex-col bg-muted/30 hidden md:flex order-1 md:order-2">
          <div className="p-2.5 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              <span className="font-semibold text-sm">Cart ({cart.reduce((s, i) => s + i.quantity, 0)})</span>
            </div>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" className="text-destructive h-6 text-xs px-2" onClick={() => setCart([])}>
                Clear
              </Button>
            )}
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2">
              <CartItems />
            </div>
          </ScrollArea>
          <div className="border-t p-2.5">
            <CartFooter />
          </div>
        </div>
      </div>

      {/* Mobile Cart FAB */}
      {cart.length > 0 && (
        <div className="md:hidden fixed bottom-20 left-3 right-3 z-40">
          <Button
            className="w-full h-12 rounded-2xl shadow-lg text-sm font-semibold"
            onClick={() => setShowMobileCart(true)}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            <span>{cart.reduce((s, i) => s + i.quantity, 0)} items</span>
            <span className="mx-2">•</span>
            <span>৳{totalAmount.toFixed(2)}</span>
          </Button>
        </div>
      )}

      {/* Mobile Cart Sheet */}
      <Sheet open={showMobileCart} onOpenChange={setShowMobileCart}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0 flex flex-col">
          <SheetHeader className="p-3 pb-2 border-b shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2 text-sm">
                <ShoppingCart className="h-4 w-4" />
                Cart ({cart.reduce((s, i) => s + i.quantity, 0)})
              </SheetTitle>
              {cart.length > 0 && (
                <Button variant="ghost" size="sm" className="text-destructive text-xs h-6" onClick={() => setCart([])}>
                  Clear
                </Button>
              )}
            </div>
          </SheetHeader>
          <ScrollArea className="flex-1 px-3 py-2">
            <CartItems />
          </ScrollArea>
          <div className="border-t p-3 shrink-0">
            <CartFooter />
          </div>
        </SheetContent>
      </Sheet>

      {/* IMEI/Serial Selection Dialog */}
      <Dialog open={!!imeiProductId} onOpenChange={(o) => !o && setImeiProductId(null)}>
        <DialogContent className="max-w-[90vw] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">
              Select IMEI/Serial — {imeiProduct?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[50vh] overflow-auto">
            {!availableSerials || availableSerials.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No available serial numbers for this product. Purchase with serial/IMEI first.
              </p>
            ) : (
              availableSerials.map((sn) => {
                const isSelected = alreadySelectedSerials.has(sn);
                return (
                  <button
                    key={sn}
                    onClick={() => {
                      if (!isSelected) {
                        addSerialToCart(imeiProductId!, sn);
                      } else {
                        removeSerialFromCart(imeiProductId!, sn);
                      }
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                      isSelected
                        ? "bg-primary/10 border-primary text-primary font-medium"
                        : "hover:bg-accent"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono">{sn}</span>
                      {isSelected && <Badge variant="default" className="text-[10px]">Selected</Badge>}
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setImeiProductId(null)} className="w-full">
              Done ({alreadySelectedSerials.size} selected)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Barcode Scanner Dialog */}
      <Dialog open={showScanner} onOpenChange={setShowScanner}>
        <DialogContent className="max-w-[90vw] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Scan Barcode</DialogTitle>
          </DialogHeader>
          <Suspense fallback={<div className="text-center py-8 text-muted-foreground">Loading...</div>}>
            {showScanner && <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setShowScanner(false)} />}
          </Suspense>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">৳{totalAmount.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground mt-1">{cart.reduce((s, i) => s + i.quantity, 0)} items</div>
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
                  className="h-14 flex-col gap-1"
                  onClick={() => setPaymentMethod(m.value)}
                >
                  <m.icon className="h-5 w-5" />
                  <span className="text-xs">{m.label}</span>
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayment(false)}>Cancel</Button>
            <Button onClick={handleComplete} disabled={createSale.isPending}>
              {createSale.isPending ? "Processing..." : "Complete Sale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={() => {}}>
        <DialogContent className="max-w-[90vw] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">Sale Complete!</DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-3">
            <div className="mx-auto w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <Receipt className="h-7 w-7 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-primary">৳{totalAmount.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">Invoice: {lastInvoice}</div>
            <div className="text-sm text-muted-foreground capitalize">Paid via {paymentMethod}</div>
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

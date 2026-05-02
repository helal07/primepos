import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Search, Plus, Minus, Trash2, X, ShoppingCart, CreditCard, Banknote,
  ScanBarcode, FileText, Clock, Pencil,
} from "lucide-react";
import { lazy, Suspense } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const BarcodeScanner = lazy(() => import("@/components/pos/BarcodeScanner"));
import { useProducts, useCategories, useBrands } from "@/hooks/useInventory";
import { useCustomers } from "@/hooks/useContacts";
import { useSaleMutations, useSale, useSaleItems, type SaleItem } from "@/hooks/useSales";
import { useSettings } from "@/hooks/useSettings";
import { PaymentDialog, type PaymentRow } from "@/components/payments/PaymentDialog";
import { useAvailableSerials } from "@/hooks/useAvailableSerials";
import { searchImeiInPurchases } from "@/hooks/useImeiValidation";
import { SaleInvoice } from "@/components/sales/SaleInvoice";
import { useSellingPriceGroups, useCustomerGroups, useProductGroupPricesMap } from "@/hooks/usePriceGroups";
import { resolvePrice } from "@/lib/priceGroup";

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
  const { data: settings } = useSettings();
  const { data: priceGroups } = useSellingPriceGroups();
  const { data: customerGroups } = useCustomerGroups();
  const { data: groupPriceMap } = useProductGroupPricesMap();

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState("");
  const customerSelectValue = customerId || "walk-in";
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState("fixed");
  const [shippingCost, setShippingCost] = useState(0);
  const [showPayment, setShowPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);
  const [lastInvoice, setLastInvoice] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [filterType, setFilterType] = useState<"category" | "brand">("category");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [imeiProductId, setImeiProductId] = useState<string | null>(null);
  const { data: availableSerials } = useAvailableSerials(imeiProductId);
  const [saleDate, setSaleDate] = useState<Date>(new Date());
  const [activePriceGroupId, setActivePriceGroupId] = useState<string | null>(null);

  // Derive default price group from selected customer's group
  const customerDefaultGroupId = useMemo(() => {
    if (!customerId || !customers || !customerGroups) return null;
    const cust: any = (customers as any[]).find((c: any) => c.id === customerId);
    if (!cust?.customer_group_id) return null;
    const cg = customerGroups.find((g) => g.id === cust.customer_group_id);
    return cg?.selling_price_group_id || null;
  }, [customerId, customers, customerGroups]);

  // Auto-switch to customer's group, but allow manual override
  useEffect(() => {
    setActivePriceGroupId(customerDefaultGroupId);
  }, [customerDefaultGroupId]);

  // Re-price cart items when active group changes
  useEffect(() => {
    if (!products || !groupPriceMap) return;
    setCart((prev) => prev.map((item) => {
      const product = (products as any[]).find((p: any) => p.id === item.product_id);
      if (!product) return item;
      const newPrice = resolvePrice(product, null, Number(product.selling_price), activePriceGroupId, groupPriceMap);
      const qty = item.quantity;
      return { ...item, unit_price: newPrice, total: qty * newPrice * (1 + item.tax_percent / 100) };
    }));
  }, [activePriceGroupId, groupPriceMap, products]);

  // Fetch last sale for invoice printing
  const { data: lastSaleData } = useSale(lastSaleId);
  const { data: lastSaleItems } = useSaleItems(lastSaleId);

  const dateStr = format(saleDate, "dd/MM/yyyy");
  const timeStr = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

  const handleBarcodeScan = async (code: string) => {
    setShowScanner(false);
    if (!products) return;
    const q = code.toLowerCase();
    const match = (products as any[]).find(
      (p: any) => p.barcode?.toLowerCase() === q || p.sku?.toLowerCase() === q || p.name.toLowerCase() === q
    );
    if (match) {
      addToCart(match);
      toast.success(`Added: ${match.name}`);
    } else {
      // Try IMEI search
      const imeiMatch = await searchImeiInPurchases(code);
      if (imeiMatch) {
        const product = (products as any[]).find((p: any) => p.id === imeiMatch.product_id);
        if (product) {
          addSerialToCart(imeiMatch.product_id, imeiMatch.serial_number);
          toast.success(`Added IMEI: ${imeiMatch.serial_number} (${product.name})`);
          return;
        }
      }
      setSearch(code);
      toast.error("Product not found");
    }
  };

  // IMEI search in search bar - triggered on Enter
  const handleSearchKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || !search.trim() || !products) return;
    const q = search.toLowerCase();
    const match = (products as any[]).find(
      (p: any) => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.barcode?.toLowerCase().includes(q)
    );
    if (match) {
      addToCart(match);
      setSearch("");
      return;
    }
    // Try IMEI search
    const imeiMatch = await searchImeiInPurchases(search.trim());
    if (imeiMatch) {
      const product = (products as any[]).find((p: any) => p.id === imeiMatch.product_id);
      if (product) {
        addSerialToCart(imeiMatch.product_id, imeiMatch.serial_number);
        toast.success(`Added IMEI: ${imeiMatch.serial_number} (${product.name})`);
        setSearch("");
        return;
      }
    }
    toast.error("No product or IMEI found");
  };

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    let filtered = products as any[];
    const q = search.toLowerCase();
    if (q) {
      filtered = filtered.filter((p: any) =>
        p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.barcode?.toLowerCase().includes(q)
      );
    }
    if (filterType === "category" && selectedCategory !== "all") {
      filtered = filtered.filter((p: any) => p.category_id === selectedCategory);
    }
    if (filterType === "brand" && selectedBrand !== "all") {
      filtered = filtered.filter((p: any) => p.brand_id === selectedBrand);
    }
    return filtered;
  }, [search, products, filterType, selectedCategory, selectedBrand]);

  const addToCart = useCallback((product: any) => {
    const isSerial = product.serial_tracking || product.product_type === "imei" || product.product_type === "serial";
    if (isSerial) { setImeiProductId(product.id); return; }
    setCart((prev) => {
      const exists = prev.find((i) => i.product_id === product.id);
      if (exists) {
        return prev.map((i) =>
          i.product_id === product.id
            ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unit_price * (1 + i.tax_percent / 100) }
            : i
        );
      }
      const base = Number(product.selling_price);
      const price = resolvePrice(product, null, base, activePriceGroupId, groupPriceMap || {});
      const tax = Number(product.tax_percent);
      return [...prev, {
        product_id: product.id, product_name: product.name, quantity: 1,
        unit_price: price, discount: 0, tax_percent: tax, total: price * (1 + tax / 100),
        serial_tracking: false,
      }];
    });
  }, [activePriceGroupId, groupPriceMap]);

  const addSerialToCart = (productId: string, serial: string) => {
    const product = (products as any[])?.find((p: any) => p.id === productId);
    if (!product) return;
    setCart((prev) => {
      const exists = prev.find((i) => i.product_id === productId && i.serial_tracking);
      if (exists) {
        const updatedSerials = [...(exists.selected_serials || []), serial];
        return prev.map((i) =>
          i.product_id === productId && i.serial_tracking
            ? { ...i, quantity: updatedSerials.length, selected_serials: updatedSerials, total: updatedSerials.length * i.unit_price * (1 + i.tax_percent / 100) }
            : i
        );
      }
      const base = Number(product.selling_price);
      const price = resolvePrice(product, null, base, activePriceGroupId, groupPriceMap || {});
      const tax = Number(product.tax_percent);
      return [...prev, {
        product_id: product.id, product_name: product.name, quantity: 1,
        unit_price: price, discount: 0, tax_percent: tax, total: price * (1 + tax / 100),
        serial_tracking: true, selected_serials: [serial],
      }];
    });
  };

  const removeSerialFromCart = (productId: string, serial: string) => {
    setCart((prev) =>
      prev.map((i) => {
        if (i.product_id !== productId || !i.serial_tracking) return i;
        const updated = (i.selected_serials || []).filter((s) => s !== serial);
        if (updated.length === 0) return null;
        return { ...i, quantity: updated.length, selected_serials: updated, total: updated.length * i.unit_price * (1 + i.tax_percent / 100) };
      }).filter(Boolean) as CartItem[]
    );
  };

  const updateQty = (index: number, newQty: number) => {
    setCart((prev) =>
      prev.map((item, i) => {
        if (i !== index || item.serial_tracking) return item;
        const qty = Math.max(1, newQty);
        return { ...item, quantity: qty, total: qty * item.unit_price * (1 + item.tax_percent / 100) };
      })
    );
  };

  const removeItem = (index: number) => setCart(cart.filter((_, i) => i !== index));

  const subtotal = cart.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const taxAmount = cart.reduce((s, i) => s + i.quantity * i.unit_price * (i.tax_percent / 100), 0);
  const discountAmount = discountType === "percentage" ? subtotal * (discountValue / 100) : discountValue;
  const totalAmount = subtotal - discountAmount + taxAmount + shippingCost;

  const handleCompleteWithPayments = async (payments: PaymentRow[], paymentStatus: string) => {
    if (cart.length === 0) return;
    // Block credit/partial sales for walk-in customers and enforce credit limit
    const totalPaying = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const dueNow = totalAmount - totalPaying;
    if (paymentStatus !== "paid" || dueNow > 0.001) {
      if (!customerId) {
        toast.error("Walk-in customers cannot have due/credit sales. Select a customer or take full payment.");
        return;
      }
      const cust = (customers ?? []).find((c: any) => c.id === customerId);
      const limit = cust?.credit_limit;
      if (limit != null && Number(cust.balance || 0) + dueNow > Number(limit)) {
        toast.error(`Credit limit exceeded. Limit ৳${Number(limit).toLocaleString()}, current balance ৳${Number(cust.balance || 0).toLocaleString()}.`);
        return;
      }
    }
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
      sale_date: format(saleDate, "yyyy-MM-dd"),
      discount_type: discountType, discount_value: discountValue,
      discount_amount: discountAmount, tax_amount: taxAmount, shipping_cost: shippingCost,
      total_amount: totalAmount, payment_method: payments[0]?.payment_method || "cash",
      payment_status: paymentStatus, items: expandedItems,
    });
    await createSalePayments.mutateAsync({ saleId: result.id, payments });
    setLastInvoice(result.invoice_number);
    setLastSaleId(result.id);
    setShowPayment(false);
    setShowMobileCart(false);
    setShowReceipt(true);
  };

  const handleQuickCash = async () => {
    if (cart.length === 0) return;
    await handleCompleteWithPayments([{ payment_method: "cash", amount: totalAmount, payment_note: "" }], "paid");
  };

  const handleCreditSale = async () => {
    if (cart.length === 0) return;
    if (!customerId) {
      toast.error("Select a customer to record a credit sale. Walk-in customers must pay in full.");
      return;
    }
    await handleCompleteWithPayments([], "unpaid");
  };

  const handleCardSale = async () => {
    if (cart.length === 0) return;
    await handleCompleteWithPayments([{ payment_method: "card", amount: totalAmount, payment_note: "" }], "paid");
  };

  const handleNewSale = () => {
    setCart([]); setCustomerId(""); setDiscountValue(0); setShippingCost(0);
    setShowReceipt(false); setLastInvoice(""); setLastSaleId(null);
    setSaleDate(new Date());
  };

  const handleCancel = () => {
    setCart([]); setCustomerId(""); setDiscountValue(0); setShippingCost(0);
  };

  const imeiProduct = useMemo(() => {
    if (!imeiProductId || !products) return null;
    return (products as any[]).find((p: any) => p.id === imeiProductId);
  }, [imeiProductId, products]);

  const alreadySelectedSerials = useMemo(() => {
    if (!imeiProductId) return new Set<string>();
    const item = cart.find((i) => i.product_id === imeiProductId && i.serial_tracking);
    return new Set(item?.selected_serials || []);
  }, [imeiProductId, cart]);

  return (
    <div className="h-[calc(100vh-4rem)] -m-4 flex flex-col bg-background">
      {/* Main Content: Left Cart + Right Products */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT — Cart Area */}
        <div className="flex-1 flex flex-col border-r bg-card overflow-hidden">
          {/* Cart Header: Customer + Search + Date */}
          <div className="p-3 border-b space-y-2">
            <div className="flex items-center gap-2">
              <Select value={customerSelectValue} onValueChange={(v) => setCustomerId(v === "walk-in" ? "" : v)}>
                <SelectTrigger className="w-[180px] h-9 text-sm">
                  <SelectValue placeholder="Walk-in Customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk-in">Walk-in Customer</SelectItem>
                  {(customers ?? []).map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Enter Product name / SKU / IMEI / Scan barcode"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="pl-8 h-9 text-sm"
                  autoFocus
                />
              </div>
              <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setShowScanner(true)}>
                <ScanBarcode className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("h-7 gap-1 text-xs", "bg-primary/10 text-primary border-primary/20")}>
                    <CalendarIcon className="h-3 w-3" />
                    {dateStr} {timeStr}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={saleDate}
                    onSelect={(d) => d && setSaleDate(d)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              {priceGroups && priceGroups.filter(g => g.is_active).length > 0 && (
                <Select
                  value={activePriceGroupId ?? "default"}
                  onValueChange={(v) => setActivePriceGroupId(v === "default" ? null : v)}
                >
                  <SelectTrigger className="h-7 w-[160px] text-xs">
                    <SelectValue placeholder="Default Pricing" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default Pricing</SelectItem>
                    {priceGroups.filter(g => g.is_active).map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Cart Table */}
          <ScrollArea className="flex-1">
            {cart.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground text-sm">Search and add products to the cart</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Product</TableHead>
                    <TableHead className="w-[140px] text-center font-semibold">Quantity</TableHead>
                    <TableHead className="w-[100px] text-right font-semibold">Subtotal</TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cart.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <div className="font-medium text-sm text-primary">{item.product_name}</div>
                        {item.serial_tracking && item.selected_serials && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.selected_serials.map((sn) => (
                              <Badge key={sn} variant="outline" className="text-[10px] gap-1 pr-1 font-mono">
                                {sn}
                                <button onClick={() => removeSerialFromCart(item.product_id, sn)} className="hover:text-destructive">
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {!item.serial_tracking ? (
                            <>
                              <Button variant="outline" size="icon" className="h-7 w-7 text-destructive border-destructive/30"
                                onClick={() => updateQty(idx, item.quantity - 1)}>
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                type="number" min={1} value={item.quantity}
                                onChange={(e) => updateQty(idx, parseInt(e.target.value) || 1)}
                                className="h-7 w-14 text-center text-sm"
                              />
                              <Button variant="outline" size="icon" className="h-7 w-7 text-primary border-primary/30"
                                onClick={() => updateQty(idx, item.quantity + 1)}>
                                <Plus className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <Badge variant="secondary">{item.quantity} IMEI</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">৳ {item.total.toFixed(0)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(idx)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>

          {/* Cart Footer Summary */}
          <div className="border-t p-3 bg-muted/30 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Items: {cart.reduce((s, i) => s + i.quantity, 0)}</span>
              <span className="text-sm font-bold">Total: {subtotal.toFixed(0)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                Discount (-): <Pencil className="h-3 w-3 cursor-pointer text-primary" />
                <Input
                  type="number" min={0} value={discountValue}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  className="h-6 w-16 text-xs inline-block"
                />
              </span>
              <span className="flex items-center gap-1">
                Shipping(+): <Pencil className="h-3 w-3 cursor-pointer text-primary" />
                <Input
                  type="number" min={0} value={shippingCost}
                  onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
                  className="h-6 w-16 text-xs inline-block"
                />
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT — Product Grid */}
        <div className="w-[45%] lg:w-[50%] flex-col overflow-hidden hidden md:flex">
          {/* Category / Brand Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => { setFilterType("category"); setSelectedBrand("all"); }}
              className={`flex-1 py-2.5 text-sm font-semibold text-center transition-colors ${
                filterType === "category"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              📋 Category
            </button>
            <button
              onClick={() => { setFilterType("brand"); setSelectedCategory("all"); }}
              className={`flex-1 py-2.5 text-sm font-semibold text-center transition-colors ${
                filterType === "brand"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              🏷️ Brands
            </button>
          </div>

          {/* Sub-filter pills */}
          <div className="px-2 py-1.5 border-b bg-muted/20 overflow-x-auto">
            <div className="flex gap-1.5">
              <button
                onClick={() => { setSelectedCategory("all"); setSelectedBrand("all"); }}
                className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                  (filterType === "category" && selectedCategory === "all") || (filterType === "brand" && selectedBrand === "all")
                    ? "bg-primary text-primary-foreground" : "bg-card border hover:bg-accent"
                }`}
              >
                All
              </button>
              {filterType === "category"
                ? (categories ?? []).map((cat: any) => (
                    <button key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                        selectedCategory === cat.id ? "bg-primary text-primary-foreground" : "bg-card border hover:bg-accent"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))
                : (brands ?? []).map((brand: any) => (
                    <button key={brand.id}
                      onClick={() => setSelectedBrand(brand.id)}
                      className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                        selectedBrand === brand.id ? "bg-primary text-primary-foreground" : "bg-card border hover:bg-accent"
                      }`}
                    >
                      {brand.name}
                    </button>
                  ))
              }
            </div>
          </div>

          {/* Product Grid */}
          <ScrollArea className="flex-1 p-2">
            {productsLoading ? (
              <div className="text-center py-12 text-muted-foreground text-sm">Loading...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No products found</div>
            ) : (
              <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                {filteredProducts.map((product: any) => {
                  const isSerial = product.serial_tracking || product.product_type === "imei" || product.product_type === "serial";
                  return (
                    <button key={product.id} onClick={() => addToCart(product)}
                      className="text-left p-2 rounded-lg border bg-card hover:bg-accent hover:border-primary/30 transition-all active:scale-[0.97] shadow-sm">
                      {product.image_url ? (
                        <div className="w-full aspect-square rounded-md bg-muted mb-1.5 overflow-hidden">
                          <img src={product.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      ) : (
                        <div className="w-full aspect-square rounded-md bg-muted mb-1.5 flex items-center justify-center">
                          <span className="text-2xl text-muted-foreground/30">📦</span>
                        </div>
                      )}
                      <div className="text-xs font-medium line-clamp-2 leading-tight min-h-[2rem]">{product.name}</div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-xs font-bold text-primary">৳{Number(product.selling_price).toLocaleString()}</span>
                        <div className="flex items-center gap-1">
                          {isSerial && <Badge variant="secondary" className="text-[8px] h-4 px-1">IMEI</Badge>}
                          <span className="text-[10px] text-muted-foreground">{product.stock_quantity} Pcs</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="h-14 border-t bg-card flex items-center px-3 gap-2 shrink-0">
        <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => navigate("/sales")}>
          <FileText className="h-3.5 w-3.5" /> Quotation
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1 text-xs"
          onClick={handleCreditSale}
          disabled={cart.length === 0 || !customerId || createSale.isPending}
          title={!customerId ? "Select a customer first — walk-in cannot use credit" : undefined}
        >
          ✓ Credit Sale
        </Button>
        <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={handleCardSale} disabled={cart.length === 0 || createSale.isPending}>
          <CreditCard className="h-3.5 w-3.5" /> Card
        </Button>
        <Button size="sm" className="gap-1 text-xs bg-primary hover:bg-primary/90" onClick={() => setShowPayment(true)} disabled={cart.length === 0}>
          <Banknote className="h-3.5 w-3.5" /> Multiple Pay
        </Button>
        <Button size="sm" className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleQuickCash} disabled={cart.length === 0 || createSale.isPending}>
          💵 Cash
        </Button>
        <Button variant="destructive" size="sm" className="gap-1 text-xs" onClick={handleCancel} disabled={cart.length === 0}>
          ✕ Cancel
        </Button>

        <div className="ml-auto flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Total Payable:</div>
            <div className="text-xl font-bold">৳ {totalAmount.toFixed(0)}</div>
          </div>
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => navigate("/sales")}>
            <Clock className="h-3.5 w-3.5" /> Recent
          </Button>
        </div>
      </div>

      {/* Mobile Cart FAB */}
      {cart.length > 0 && (
        <div className="md:hidden fixed bottom-20 left-3 right-3 z-40">
          <Button className="w-full h-12 rounded-2xl shadow-lg text-sm font-semibold" onClick={() => setShowMobileCart(true)}>
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
            <SheetTitle className="flex items-center gap-2 text-sm">
              <ShoppingCart className="h-4 w-4" /> Cart ({cart.reduce((s, i) => s + i.quantity, 0)})
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 px-3 py-2">
            {cart.map((item, idx) => (
              <div key={idx} className="p-2 border-b flex items-center gap-2">
                <div className="flex-1">
                  <div className="text-sm font-medium">{item.product_name}</div>
                  <div className="text-xs text-muted-foreground">৳{item.unit_price} × {item.quantity}</div>
                </div>
                <span className="font-semibold text-sm">৳{item.total.toFixed(0)}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(idx)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </ScrollArea>
          <div className="border-t p-3 space-y-2">
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span><span>৳{totalAmount.toFixed(2)}</span>
            </div>
            <Button className="w-full h-12" disabled={cart.length === 0} onClick={() => { setShowMobileCart(false); setShowPayment(true); }}>
              Pay ৳{totalAmount.toFixed(2)}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* IMEI Selection Dialog */}
      <Dialog open={!!imeiProductId} onOpenChange={(o) => !o && setImeiProductId(null)}>
        <DialogContent className="max-w-[90vw] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Select IMEI/Serial — {imeiProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[50vh] overflow-auto">
            {!availableSerials || availableSerials.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No available serial numbers.</p>
            ) : (
              availableSerials.map((sn) => {
                const isSelected = alreadySelectedSerials.has(sn);
                return (
                  <button key={sn}
                    onClick={() => isSelected ? removeSerialFromCart(imeiProductId!, sn) : addSerialToCart(imeiProductId!, sn)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                      isSelected ? "bg-primary/10 border-primary text-primary font-medium" : "hover:bg-accent"
                    }`}>
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
            <Button onClick={() => setImeiProductId(null)} className="w-full">Done ({alreadySelectedSerials.size} selected)</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Barcode Scanner */}
      <Dialog open={showScanner} onOpenChange={setShowScanner}>
        <DialogContent className="max-w-[90vw] sm:max-w-sm">
          <DialogHeader><DialogTitle>Scan Barcode</DialogTitle></DialogHeader>
          <Suspense fallback={<div className="text-center py-8 text-muted-foreground">Loading...</div>}>
            {showScanner && <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setShowScanner(false)} />}
          </Suspense>
        </DialogContent>
      </Dialog>

      {/* Receipt / Invoice Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader><DialogTitle>Sale Complete — Invoice {lastInvoice}</DialogTitle></DialogHeader>
          {lastSaleData && lastSaleItems ? (
            <SaleInvoice
              sale={lastSaleData}
              items={lastSaleItems}
              settings={settings || {}}
              onPrint={() => {
                const printArea = document.getElementById("invoice-print-area");
                if (!printArea) return;
                const w = window.open("", "_blank");
                if (!w) return;
                w.document.write(`<html><head><title>Invoice ${lastInvoice}</title><style>body{font-family:Arial,sans-serif;margin:0;padding:20px}table{width:100%;border-collapse:collapse}th,td{padding:8px;text-align:left}th{border-bottom:2px solid #d1d5db;font-size:12px;background:#f3f4f6}td{border-bottom:1px solid #e5e7eb;font-size:12px}.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:20px}</style></head><body>${printArea.innerHTML}</body></html>`);
                w.document.close();
                w.print();
              }}
            />
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">✅</div>
              <p className="text-muted-foreground">Invoice: <strong>{lastInvoice}</strong></p>
              <p className="text-lg font-bold">৳{totalAmount.toFixed(2)}</p>
            </div>
          )}
          <DialogFooter className="flex-col gap-2">
            <Button onClick={handleNewSale} className="w-full">New Sale</Button>
            <Button variant="outline" onClick={() => navigate("/sales")} className="w-full">View Sales</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <PaymentDialog
        open={showPayment}
        onOpenChange={setShowPayment}
        totalAmount={totalAmount}
        onFinalize={handleCompleteWithPayments}
        isPending={createSale.isPending}
      />
    </div>
  );
}

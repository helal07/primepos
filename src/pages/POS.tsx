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
  Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";
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
  ScanBarcode, FileText, Clock, UserPlus,
  AlertCircle, Check, ChevronsUpDown,
} from "lucide-react";
import { lazy, Suspense } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const BarcodeScanner = lazy(() => import("@/components/pos/BarcodeScanner"));
import { useProducts, useCategories, useBrands } from "@/hooks/useInventory";
import { useCustomers } from "@/hooks/useContacts";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useSaleMutations, useSale, useSaleItems, type SaleItem } from "@/hooks/useSales";
import { useSettings } from "@/hooks/useSettings";
import { PaymentDialog, type PaymentRow } from "@/components/payments/PaymentDialog";
import { useAvailableSerials } from "@/hooks/useAvailableSerials";
import { searchImeiInPurchases } from "@/hooks/useImeiValidation";
import { SaleInvoice } from "@/components/sales/SaleInvoice";
import { useSellingPriceGroups, useCustomerGroups, useProductGroupPricesMap } from "@/hooks/usePriceGroups";
import { useProductStockMap } from "@/hooks/useWarehouses";
import { resolvePrice } from "@/lib/priceGroup";
import { printInvoiceArea } from "@/lib/printInvoice";

interface CartItem extends SaleItem {
  serial_tracking?: boolean;
  selected_serials?: string[];
}

// Fuzzy product matcher: prefers starts-with on name/SKU/barcode, then contains,
// then all-token contains on the name. Returns the best single match or null.
function fuzzyFindProduct(products: any[], rawQuery: string): any | null {
  const q = rawQuery.trim().toLowerCase();
  if (!q || !products?.length) return null;
  const fields = (p: any) => [p.name, p.sku, p.barcode].filter(Boolean).map((s: string) => s.toLowerCase());

  // 1) starts-with on any field
  const starts = products.find((p) => fields(p).some((f) => f.startsWith(q)));
  if (starts) return starts;

  // 2) contains on any field
  const contains = products.find((p) => fields(p).some((f) => f.includes(q)));
  if (contains) return contains;

  // 3) all tokens present in name (handles "iphone 13 pro" vs "Apple iPhone 13 Pro 128GB")
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    const tokenMatch = products.find((p) => {
      const name = (p.name || "").toLowerCase();
      return tokens.every((t) => name.includes(t));
    });
    if (tokenMatch) return tokenMatch;
  }
  return null;
}

export default function POS() {
  const navigate = useNavigate();
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: categories } = useCategories();
  const { data: brands } = useBrands();
  const { data: customers } = useCustomers();
  const qc = useQueryClient();
  const { createSale, createSalePayments } = useSaleMutations();
  const { data: settings } = useSettings();
  const { data: priceGroups } = useSellingPriceGroups();
  const { data: customerGroups } = useCustomerGroups();
  const { data: groupPriceMap } = useProductGroupPricesMap();
  const { data: stockMap } = useProductStockMap();
  const getStock = useCallback(
    (p: any) => {
      const ws = stockMap?.get(p.id);
      if (typeof ws === "number") return ws;
      return Number(p?.stock_quantity ?? 0);
    },
    [stockMap]
  );

  const [search, setSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
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
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCust, setNewCust] = useState({ name: "", phone: "", email: "", address: "" });
  const [savingCust, setSavingCust] = useState(false);
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
    // 1. Try exact barcode/SKU match first (non-serial items use barcode)
    const exact = (products as any[]).find(
      (p: any) => p.barcode?.toLowerCase() === q || p.sku?.toLowerCase() === q
    );
    if (exact) {
      const isSerial = exact.serial_tracking || exact.product_type === "imei" || exact.product_type === "serial";
      if (!isSerial) {
        addToCart(exact);
        toast.success(`Added: ${exact.name}`);
        return;
      }
    }
    // 2. Try IMEI lookup (adds the specific serial directly, no dialog)
    const imeiMatch = await searchImeiInPurchases(code);
    if (imeiMatch) {
      const product = (products as any[]).find((p: any) => p.id === imeiMatch.product_id);
      if (product) {
        addSerialToCart(imeiMatch.product_id, imeiMatch.serial_number);
        toast.success(`Added IMEI: ${imeiMatch.serial_number} (${product.name})`);
        return;
      }
    }
    // 3. Fuzzy fallback on name/SKU/barcode
    const fuzzy = fuzzyFindProduct(products as any[], q);
    if (fuzzy) {
      addToCart(fuzzy);
      toast.success(`Added: ${fuzzy.name}`);
      return;
    }
    setSearch(code);
    toast.error("Product not found");
  };

  // IMEI search in search bar - triggered on Enter
  const handleSearchKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || !search.trim() || !products) return;
    const raw = search.trim();
    const q = raw.toLowerCase();
    // 1. Exact barcode/SKU match — for non-serial items, add directly (no popup)
    const exact = (products as any[]).find(
      (p: any) => p.barcode?.toLowerCase() === q || p.sku?.toLowerCase() === q
    );
    if (exact) {
      const isSerial = exact.serial_tracking || exact.product_type === "imei" || exact.product_type === "serial";
      if (!isSerial) {
        addToCart(exact);
        setSearch("");
        return;
      }
    }
    // 2. IMEI lookup — adds the specific serial directly without opening selector
    const imeiMatch = await searchImeiInPurchases(raw);
    if (imeiMatch) {
      const product = (products as any[]).find((p: any) => p.id === imeiMatch.product_id);
      if (product) {
        addSerialToCart(imeiMatch.product_id, imeiMatch.serial_number);
        toast.success(`Added IMEI: ${imeiMatch.serial_number} (${product.name})`);
        setSearch("");
        return;
      }
    }
    // 3. Fuzzy fallback (starts-with > contains > token match) on name/SKU/barcode
    const fuzzy = fuzzyFindProduct(products as any[], q);
    if (fuzzy) {
      addToCart(fuzzy);
      toast.success(`Added: ${fuzzy.name}`);
      setSearch("");
      return;
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

  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!products || q.length < 3) return [];
    const matches = (products as any[]).filter((p: any) =>
      p.name?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) ||
      p.barcode?.toLowerCase().includes(q)
    );
    matches.sort((a: any, b: any) => {
      const aStock = getStock(a) > 0 ? 0 : 1;
      const bStock = getStock(b) > 0 ? 0 : 1;
      if (aStock !== bStock) return aStock - bStock;
      const an = a.name?.toLowerCase() ?? "";
      const bn = b.name?.toLowerCase() ?? "";
      const aStarts = an.startsWith(q) ? 0 : 1;
      const bStarts = bn.startsWith(q) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return an.localeCompare(bn);
    });
    return matches.slice(0, 20);
  }, [search, products, getStock]);

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
    // Prevent adding the same IMEI/serial twice across the entire cart
    const dup = cart.some((i) => (i.selected_serials || []).includes(serial));
    if (dup) {
      toast.warning(`IMEI ${serial} is already in this sale`);
      return;
    }
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
    if (cart.length === 0) {
      toast.error("Cart is empty. Add at least one product before taking payment.");
      return;
    }
    await handleCompleteWithPayments([{ payment_method: "cash", amount: totalAmount, payment_note: "" }], "paid");
  };

  const handleCreditSale = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty. Add at least one product before recording a credit sale.");
      return;
    }
    if (!customerId) {
      toast.error("Select a customer to record a credit sale. Walk-in customers must pay in full.");
      return;
    }
    await handleCompleteWithPayments([], "unpaid");
  };

  const handleCardSale = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty. Add at least one product before taking payment.");
      return;
    }
    await handleCompleteWithPayments([{ payment_method: "card", amount: totalAmount, payment_note: "" }], "paid");
  };

  const openPaymentDialog = () => {
    if (cart.length === 0) {
      toast.error("Cart is empty. Add at least one product before opening payment.");
      return;
    }
    setShowPayment(true);
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
            {/* Search row — full width on mobile */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Product / SKU / IMEI / Barcode"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  className="pl-8 h-11 md:h-9 text-base md:text-sm"
                />
                {showSuggestions && search.trim().length >= 3 && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 max-h-72 overflow-y-auto rounded-md border bg-popover shadow-lg">
                    {suggestions.length === 0 ? (
                      <div className="px-3 py-3 text-sm text-muted-foreground">No products found</div>
                    ) : (
                      suggestions.map((p: any) => {
                        const stockQty = getStock(p);
                        const inStock = stockQty > 0;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              addToCart(p);
                              setSearch("");
                              setShowSuggestions(false);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-accent flex items-center justify-between gap-2 border-b last:border-b-0"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium truncate">{p.name}</div>
                              <div className="text-[11px] text-muted-foreground truncate">
                                {p.sku ? `SKU: ${p.sku}` : ""}{p.sku && p.barcode ? " • " : ""}{p.barcode ? `BC: ${p.barcode}` : ""}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-sm font-semibold">{Number(p.selling_price).toFixed(2)}</div>
                              <div className={cn("text-[10px]", inStock ? "text-emerald-600" : "text-destructive")}>
                                {inStock ? `Stock: ${stockQty}` : "Out of stock"}
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
              <Button variant="outline" size="icon" className="h-11 w-11 md:h-9 md:w-9 shrink-0" onClick={() => setShowScanner(true)}>
                <ScanBarcode className="h-5 w-5 md:h-4 md:w-4" />
              </Button>
            </div>
            {/* Customer row */}
            <CustomerPicker
              customers={(customers ?? []) as any[]}
              value={customerId}
              onChange={setCustomerId}
              onAddNew={() => setShowAddCustomer(true)}
            />
            {/* Selected customer summary: due / advance / group */}
            {customerId && (() => {
              const c: any = (customers ?? []).find((x: any) => x.id === customerId);
              if (!c) return null;
              const bal = Number(c.balance) || 0;
              const limit = Number(c.credit_limit) || 0;
              const grp = c.customer_group_id
                ? (customerGroups ?? []).find((g: any) => g.id === c.customer_group_id)
                : null;
              return (
                <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-2.5 py-1.5 text-xs">
                  <span className="font-medium text-foreground">{c.name}</span>
                  {grp && (
                    <Badge variant="secondary" className="text-[10px]">Group: {grp.name}</Badge>
                  )}
                  {bal > 0 ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-destructive">
                      <AlertCircle className="h-3 w-3" />
                      Due: ৳ {bal.toLocaleString("en", { minimumFractionDigits: 2 })}
                    </span>
                  ) : bal < 0 ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                      Advance: ৳ {Math.abs(bal).toLocaleString("en", { minimumFractionDigits: 2 })}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">No outstanding balance</span>
                  )}
                  {limit > 0 && (
                    <span className="text-muted-foreground">
                      Credit limit: ৳ {limit.toLocaleString("en", { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              );
            })()}
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("h-8 gap-1 text-xs whitespace-nowrap", "bg-primary/10 text-primary border-primary/20")}>
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
                  <SelectTrigger className="h-8 w-full sm:w-[160px] text-xs">
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
          <ScrollArea className="flex-1 pb-24 md:pb-0">
            {cart.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground text-sm">Search and add products to the cart</div>
            ) : (
              <div className="overflow-x-auto">
              <Table className="min-w-0 w-full">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Product</TableHead>
                    <TableHead className="w-[110px] sm:w-[140px] text-center font-semibold px-1 sm:px-4">Qty</TableHead>
                    <TableHead className="w-[70px] sm:w-[100px] text-right font-semibold px-1 sm:px-4">Subtotal</TableHead>
                    <TableHead className="w-[32px] px-0 sm:px-4"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cart.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="px-2 sm:px-4">
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
                      <TableCell className="px-1 sm:px-4">
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
                                className="h-7 w-10 sm:w-14 text-center text-sm px-1"
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
                      <TableCell className="text-right font-semibold px-1 sm:px-4 text-sm">৳{item.total.toFixed(0)}</TableCell>
                      <TableCell className="px-0 pr-1 sm:px-4">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(idx)} aria-label="Remove from cart">
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </ScrollArea>

          {/* Cart Footer Summary */}
          <div className="border-t p-3 bg-muted/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Items: {cart.reduce((s, i) => s + i.quantity, 0)}</span>
              <span className="text-sm font-bold">Total: {subtotal.toFixed(0)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <label className="flex items-center gap-1 min-w-0">
                <span className="truncate">Discount (-)</span>
                <Input
                  type="number" min={0} value={discountValue}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  className="h-8 flex-1 min-w-0 text-xs"
                />
              </label>
              <label className="flex items-center gap-1 min-w-0">
                <span className="truncate">Shipping (+)</span>
                <Input
                  type="number" min={0} value={shippingCost}
                  onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
                  className="h-8 flex-1 min-w-0 text-xs"
                />
              </label>
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
                          <span aria-hidden="true" className="text-2xl text-muted-foreground">📦</span>
                        </div>
                      )}
                      <div className="text-xs font-medium line-clamp-2 leading-tight min-h-[2rem]">{product.name}</div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-xs font-bold text-primary">৳{Number(product.selling_price).toLocaleString()}</span>
                        <div className="flex items-center gap-1">
                          {isSerial && <Badge variant="secondary" className="text-[8px] h-4 px-1">IMEI</Badge>}
                          <span className="text-[10px] text-muted-foreground">{getStock(product)} Pcs</span>
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

      {/* Bottom Action Bar — hidden on mobile (replaced by FAB + sheet) */}
      <div className="hidden md:flex h-14 border-t bg-card items-center px-3 gap-2 shrink-0">
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
        <Button size="sm" className="gap-1 text-xs bg-primary hover:bg-primary/90" onClick={openPaymentDialog} disabled={cart.length === 0}>
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
          <div className="border-t p-3 space-y-3">
            {/* Discount + Shipping inline */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Discount (-)</Label>
                <Input
                  type="number" min={0} value={discountValue}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Shipping (+)</Label>
                <Input
                  type="number" min={0} value={shippingCost}
                  onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">Subtotal: ৳{subtotal.toFixed(0)}</span>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Total Payable</div>
                <div className="text-2xl font-bold">৳{totalAmount.toFixed(2)}</div>
              </div>
            </div>
            {/* Payment buttons grid */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"
                onClick={async () => { await handleQuickCash(); }}
                disabled={cart.length === 0 || createSale.isPending}
              >
                💵 Cash
              </Button>
              <Button
                variant="outline"
                className="h-12 text-sm font-semibold"
                onClick={async () => { await handleCardSale(); }}
                disabled={cart.length === 0 || createSale.isPending}
              >
                <CreditCard className="h-4 w-4 mr-1" /> Card
              </Button>
              <Button
                variant="outline"
                className="h-12 text-sm font-semibold"
                onClick={async () => { await handleCreditSale(); }}
                disabled={cart.length === 0 || !customerId || createSale.isPending}
                title={!customerId ? "Select a customer first" : undefined}
              >
                ✓ Credit Sale
              </Button>
              <Button
                className="h-12 text-sm font-semibold"
                onClick={() => { setShowMobileCart(false); openPaymentDialog(); }}
                disabled={cart.length === 0}
              >
                <Banknote className="h-4 w-4 mr-1" /> Multi-Pay
              </Button>
            </div>
            <Button
              variant="destructive"
              className="w-full h-10 text-sm"
              onClick={() => { handleCancel(); setShowMobileCart(false); }}
              disabled={cart.length === 0}
            >
              ✕ Cancel Sale
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
        <DialogContent className="max-w-[100vw] sm:max-w-md p-3 sm:p-6 h-[100dvh] sm:h-auto sm:max-h-[90vh] overflow-auto rounded-none sm:rounded-lg">
          <DialogHeader><DialogTitle>Scan Barcode / QR</DialogTitle></DialogHeader>
          <Suspense fallback={<div className="text-center py-8 text-muted-foreground">Loading...</div>}>
            {showScanner && (
              <BarcodeScanner
                continuous
                onScan={(code) => handleBarcodeScan(code)}
                onClose={() => setShowScanner(false)}
              />
            )}
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
                printInvoiceArea({ title: `Invoice ${lastInvoice}`, settings: settings || {} });
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

      {/* Quick Add Customer */}
      <Dialog open={showAddCustomer} onOpenChange={setShowAddCustomer}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                value={newCust.name}
                onChange={(e) => setNewCust((p) => ({ ...p, name: e.target.value }))}
                placeholder="Customer name"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  value={newCust.phone}
                  onChange={(e) => setNewCust((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="01XXXXXXXXX"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newCust.email}
                  onChange={(e) => setNewCust((p) => ({ ...p, email: e.target.value }))}
                  placeholder="email@example.com"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input
                value={newCust.address}
                onChange={(e) => setNewCust((p) => ({ ...p, address: e.target.value }))}
                placeholder="Address (optional)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCustomer(false)} disabled={savingCust}>
              Cancel
            </Button>
            <Button
              disabled={savingCust || !newCust.name.trim()}
              onClick={async () => {
                setSavingCust(true);
                const { data, error } = await supabase
                  .from("customers")
                  .insert({
                    name: newCust.name.trim(),
                    phone: newCust.phone || null,
                    email: newCust.email || null,
                    address: newCust.address || null,
                  })
                  .select()
                  .single();
                setSavingCust(false);
                if (error) {
                  toast.error(error.message);
                  return;
                }
                await qc.invalidateQueries({ queryKey: ["customers"] });
                if (data?.id) setCustomerId(data.id);
                toast.success("Customer added");
                setNewCust({ name: "", phone: "", email: "", address: "" });
                setShowAddCustomer(false);
              }}
            >
              {savingCust ? "Saving..." : "Save Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

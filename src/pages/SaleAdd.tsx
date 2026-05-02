import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Trash2, Search, Save, ArrowLeft, Plus, Minus, Pencil, CreditCard, Banknote, X } from "lucide-react";
import { useProducts, useCategories, useBrands } from "@/hooks/useInventory";
import { useCustomers } from "@/hooks/useContacts";
import { useSale, useSaleItems, useSaleMutations, type SaleItem } from "@/hooks/useSales";
import { PaymentDialog, type PaymentRow } from "@/components/payments/PaymentDialog";
import { toast } from "sonner";
import { useSellingPriceGroups, useCustomerGroups, useProductGroupPricesMap } from "@/hooks/usePriceGroups";
import { resolvePrice } from "@/lib/priceGroup";

export default function SaleAdd() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const isEditMode = !!editId;
  const presetStatus = searchParams.get("status"); // "order" | "quotation" | null

  const { data: products } = useProducts();
  const { data: categories } = useCategories();
  const { data: brands } = useBrands();
  const { data: customers } = useCustomers();
  const { createSale, createSalePayments, updateSale } = useSaleMutations();
  const { data: priceGroups } = useSellingPriceGroups();
  const { data: customerGroups } = useCustomerGroups();
  const { data: groupPriceMap } = useProductGroupPricesMap();

  const { data: existingSale } = useSale(editId);
  const { data: existingItems } = useSaleItems(editId);

  const [customerId, setCustomerId] = useState<string>("");
  const customerSelectValue = customerId || "walk-in";
  const [discountType, setDiscountType] = useState("fixed");
  const [discountValue, setDiscountValue] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);
  const [notes, setNotes] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [items, setItems] = useState<SaleItem[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState<"category" | "brand">("category");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [activePriceGroupId, setActivePriceGroupId] = useState<string | null>(null);

  const customerDefaultGroupId = useMemo(() => {
    if (!customerId || !customers || !customerGroups) return null;
    const cust: any = (customers as any[]).find((c: any) => c.id === customerId);
    if (!cust?.customer_group_id) return null;
    const cg = customerGroups.find((g) => g.id === cust.customer_group_id);
    return cg?.selling_price_group_id || null;
  }, [customerId, customers, customerGroups]);

  useEffect(() => {
    if (!isEditMode) setActivePriceGroupId(customerDefaultGroupId);
  }, [customerDefaultGroupId, isEditMode]);

  useEffect(() => {
    if (!products || !groupPriceMap || isEditMode) return;
    setItems((prev) => prev.map((item) => {
      const product = (products as any[]).find((p: any) => p.id === item.product_id);
      if (!product) return item;
      const newPrice = resolvePrice(product, item.variation_id ?? null, Number(product.selling_price), activePriceGroupId, groupPriceMap);
      const qty = Number(item.quantity);
      const disc = Number(item.discount);
      const tax = Number(item.tax_percent);
      return { ...item, unit_price: newPrice, total: qty * newPrice * (1 - disc / 100) * (1 + tax / 100) };
    }));
  }, [activePriceGroupId, groupPriceMap, products, isEditMode]);

  // Pre-populate in edit mode
  useEffect(() => {
    if (isEditMode && existingSale && existingItems && !initialized) {
      setCustomerId(existingSale.customer_id || "");
      setDiscountType(existingSale.discount_type || "fixed");
      setDiscountValue(Number(existingSale.discount_value) || 0);
      setShippingCost(Number(existingSale.shipping_cost) || 0);
      setNotes(existingSale.notes || "");
      setItems(
        existingItems.map((item: any) => ({
          product_id: item.product_id,
          product_name: item.products?.name || "Unknown",
          variation_id: item.variation_id,
          quantity: item.quantity,
          unit_price: Number(item.unit_price),
          discount: Number(item.discount),
          tax_percent: Number(item.tax_percent),
          total: Number(item.total),
          serial_number: item.serial_number,
        }))
      );
      setInitialized(true);
    }
  }, [isEditMode, existingSale, existingItems, initialized]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    let filtered = products as any[];
    const q = productSearch.toLowerCase();
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
  }, [productSearch, products, filterType, selectedCategory, selectedBrand]);

  const addProduct = (product: any) => {
    const exists = items.find((i) => i.product_id === product.id);
    if (exists) {
      setItems(items.map((i) =>
        i.product_id === product.id
          ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unit_price * (1 - i.discount / 100) * (1 + i.tax_percent / 100) }
          : i
      ));
    } else {
      const base = Number(product.selling_price);
      const price = resolvePrice(product, null, base, activePriceGroupId, groupPriceMap || {});
      const tax = Number(product.tax_percent);
      setItems([...items, {
        product_id: product.id, product_name: product.name,
        quantity: 1, unit_price: price, discount: 0, tax_percent: tax,
        total: price * (1 + tax / 100),
      }]);
    }
    setProductSearch("");
  };

  const updateItem = (index: number, field: keyof SaleItem, value: any) => {
    setItems(items.map((item, i) => {
      if (i !== index) return item;
      const updated = { ...item, [field]: value };
      const qty = Number(updated.quantity);
      const price = Number(updated.unit_price);
      const disc = Number(updated.discount);
      const tax = Number(updated.tax_percent);
      updated.total = qty * price * (1 - disc / 100) * (1 + tax / 100);
      return updated;
    }));
  };

  const updateQty = (index: number, newQty: number) => {
    const qty = Math.max(1, newQty);
    updateItem(index, "quantity", qty);
  };

  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const subtotal = items.reduce((sum, i) => sum + Number(i.quantity) * Number(i.unit_price), 0);
  const itemDiscountTotal = items.reduce((sum, i) => sum + Number(i.quantity) * Number(i.unit_price) * (Number(i.discount) / 100), 0);
  const discountAmount = discountType === "percentage" ? (subtotal - itemDiscountTotal) * (discountValue / 100) : discountValue;
  const afterDiscount = subtotal - itemDiscountTotal - discountAmount;
  const taxAmount = items.reduce((sum, i) => sum + Number(i.quantity) * Number(i.unit_price) * (1 - Number(i.discount) / 100) * (Number(i.tax_percent) / 100), 0);
  const totalAmount = afterDiscount + taxAmount + shippingCost;

  const handleFinalize = async (payments: PaymentRow[], paymentStatus: string) => {
    if (items.length === 0) return;
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
    const formData = {
      customer_id: customerId || null, status: "completed", subtotal,
      discount_type: discountType, discount_value: discountValue,
      discount_amount: discountAmount + itemDiscountTotal,
      tax_amount: taxAmount, shipping_cost: shippingCost, total_amount: totalAmount,
      payment_method: payments[0]?.payment_method || "cash", payment_status: paymentStatus,
      notes: notes || undefined, items,
    };
    if (isEditMode) {
      await updateSale.mutateAsync({ id: editId!, formData });
      await createSalePayments.mutateAsync({ saleId: editId!, payments });
      navigate(`/sales/${editId}`);
    } else {
      const sale = await createSale.mutateAsync(formData);
      await createSalePayments.mutateAsync({ saleId: sale.id, payments });
      navigate("/sales");
    }
    setShowPayment(false);
  };

  const handleDraft = async () => {
    if (items.length === 0) return;
    const formData = {
      customer_id: customerId || null, status: presetStatus || "draft", subtotal,
      discount_type: discountType, discount_value: discountValue,
      discount_amount: discountAmount + itemDiscountTotal,
      tax_amount: taxAmount, shipping_cost: shippingCost, total_amount: totalAmount,
      payment_method: "cash", payment_status: "unpaid",
      notes: notes || undefined, items,
    };
    if (isEditMode) {
      await updateSale.mutateAsync({ id: editId!, formData });
      navigate(`/sales/${editId}`);
    } else {
      await createSale.mutateAsync(formData);
      navigate(presetStatus === "order" ? "/sales/orders" : presetStatus === "quotation" ? "/quotations" : "/sales/drafts");
    }
  };

  const handleQuickCash = async () => {
    if (items.length === 0) return;
    await handleFinalize([{ payment_method: "cash", amount: totalAmount, payment_note: "" }], "paid");
  };

  const handleCreditSale = async () => {
    if (items.length === 0) return;
    if (!customerId) {
      toast.error("Select a customer to record a credit sale. Walk-in customers must pay in full.");
      return;
    }
    await handleFinalize([], "unpaid");
  };

  return (
    <div className="h-[calc(100vh-4rem)] -m-4 flex flex-col bg-background">
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT — Cart Area */}
        <div className="flex-1 flex flex-col border-r bg-card overflow-hidden">
          {/* Header: Back + Customer + Search */}
          <div className="p-3 border-b space-y-2">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate(isEditMode ? `/sales/${editId}` : "/sales")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-sm font-bold shrink-0">
                {isEditMode ? "Edit Sale" : presetStatus === "order" ? "New Sales Order" : presetStatus === "quotation" ? "New Quotation" : "New Sale"}
              </h1>
              <Select value={customerSelectValue} onValueChange={(v) => setCustomerId(v === "walk-in" ? "" : v)}>
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <SelectValue placeholder="Walk-in Customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk-in">Walk-in Customer</SelectItem>
                  {(customers ?? []).map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                </SelectContent>
              </Select>
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search product name / SKU / barcode..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="pl-8 h-8 text-sm" />
              </div>
              {priceGroups && priceGroups.filter(g => g.is_active).length > 0 && (
                <Select
                  value={activePriceGroupId ?? "default"}
                  onValueChange={(v) => setActivePriceGroupId(v === "default" ? null : v)}
                >
                  <SelectTrigger className="h-8 w-[150px] text-xs shrink-0">
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

          {/* Items Table */}
          <ScrollArea className="flex-1">
            {items.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground text-sm">Search and add products to the sale</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Product</TableHead>
                    <TableHead className="w-[140px] text-center font-semibold">Quantity</TableHead>
                    <TableHead className="w-[90px] text-right font-semibold">Price</TableHead>
                    <TableHead className="w-[70px] text-center font-semibold hidden sm:table-cell">Disc%</TableHead>
                    <TableHead className="w-[70px] text-center font-semibold hidden sm:table-cell">Tax%</TableHead>
                    <TableHead className="w-[100px] text-right font-semibold">Subtotal</TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium text-sm text-primary">{item.product_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="outline" size="icon" className="h-7 w-7 text-destructive border-destructive/30" onClick={() => updateQty(idx, item.quantity - 1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input type="number" min={1} value={item.quantity} onChange={(e) => updateQty(idx, parseInt(e.target.value) || 1)} className="h-7 w-14 text-center text-sm" />
                          <Button variant="outline" size="icon" className="h-7 w-7 text-primary border-primary/30" onClick={() => updateQty(idx, item.quantity + 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Input type="number" min={0} value={item.unit_price} onChange={(e) => updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)} className="h-7 w-20 text-sm text-right" />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-center">
                        <Input type="number" min={0} max={100} value={item.discount} onChange={(e) => updateItem(idx, "discount", parseFloat(e.target.value) || 0)} className="h-7 w-14 text-sm text-center" />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-center">
                        <Input type="number" min={0} value={item.tax_percent} onChange={(e) => updateItem(idx, "tax_percent", parseFloat(e.target.value) || 0)} className="h-7 w-14 text-sm text-center" />
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

          {/* Cart Footer */}
          <div className="border-t p-3 bg-muted/30 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Items: {items.reduce((s, i) => s + i.quantity, 0)}</span>
              <span className="text-sm font-bold">Total: ৳{subtotal.toFixed(0)}</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                Discount(-): <Pencil className="h-3 w-3 text-primary" />
                <Input type="number" min={0} value={discountValue} onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)} className="h-6 w-16 text-xs" />
                <Select value={discountType} onValueChange={setDiscountType}>
                  <SelectTrigger className="h-6 w-12 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">৳</SelectItem>
                    <SelectItem value="percentage">%</SelectItem>
                  </SelectContent>
                </Select>
              </span>
              <span className="flex items-center gap-1">
                Shipping(+): <Pencil className="h-3 w-3 text-primary" />
                <Input type="number" min={0} value={shippingCost} onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)} className="h-6 w-16 text-xs" />
              </span>
              <span className="flex items-center gap-1">
                Notes: <Pencil className="h-3 w-3 text-primary" />
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="h-6 w-32 text-xs" placeholder="Add notes..." />
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT — Product Grid */}
        <div className="w-[45%] lg:w-[50%] flex-col overflow-hidden hidden md:flex">
          {/* Category / Brand Tabs */}
          <div className="flex border-b">
            <button onClick={() => { setFilterType("category"); setSelectedBrand("all"); }}
              className={`flex-1 py-2.5 text-sm font-semibold text-center transition-colors ${filterType === "category" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}>
              📋 Category
            </button>
            <button onClick={() => { setFilterType("brand"); setSelectedCategory("all"); }}
              className={`flex-1 py-2.5 text-sm font-semibold text-center transition-colors ${filterType === "brand" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}>
              🏷️ Brands
            </button>
          </div>

          {/* Sub-filter pills */}
          <div className="px-2 py-1.5 border-b bg-muted/20 overflow-x-auto">
            <div className="flex gap-1.5">
              <button onClick={() => { setSelectedCategory("all"); setSelectedBrand("all"); }}
                className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                  (filterType === "category" && selectedCategory === "all") || (filterType === "brand" && selectedBrand === "all")
                    ? "bg-primary text-primary-foreground" : "bg-card border hover:bg-accent"
                }`}>
                All
              </button>
              {filterType === "category"
                ? (categories ?? []).map((cat: any) => (
                    <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                        selectedCategory === cat.id ? "bg-primary text-primary-foreground" : "bg-card border hover:bg-accent"
                      }`}>{cat.name}</button>
                  ))
                : (brands ?? []).map((brand: any) => (
                    <button key={brand.id} onClick={() => setSelectedBrand(brand.id)}
                      className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                        selectedBrand === brand.id ? "bg-primary text-primary-foreground" : "bg-card border hover:bg-accent"
                      }`}>{brand.name}</button>
                  ))
              }
            </div>
          </div>

          {/* Product Grid */}
          <ScrollArea className="flex-1 p-2">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No products found</div>
            ) : (
              <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                {filteredProducts.map((product: any) => (
                  <button key={product.id} onClick={() => addProduct(product)}
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
                      <span className="text-[10px] text-muted-foreground">{product.stock_quantity} Pcs</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="h-14 border-t bg-card flex items-center px-3 gap-2 shrink-0">
        <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={handleDraft} disabled={items.length === 0 || createSale.isPending}>
          <Save className="h-3.5 w-3.5" /> Save Draft
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1 text-xs"
          onClick={handleCreditSale}
          disabled={items.length === 0 || !customerId || createSale.isPending}
          title={!customerId ? "Select a customer first — walk-in cannot use credit" : undefined}
        >
          ✓ Credit Sale
        </Button>
        <Button size="sm" className="gap-1 text-xs bg-primary hover:bg-primary/90" onClick={() => setShowPayment(true)} disabled={items.length === 0}>
          <Banknote className="h-3.5 w-3.5" /> Multiple Pay
        </Button>
        <Button size="sm" className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleQuickCash} disabled={items.length === 0 || createSale.isPending}>
          💵 Cash
        </Button>
        <Button variant="destructive" size="sm" className="gap-1 text-xs" onClick={() => { setItems([]); setDiscountValue(0); setShippingCost(0); }} disabled={items.length === 0}>
          ✕ Cancel
        </Button>
        <div className="ml-auto flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Total Payable:</div>
            <div className="text-xl font-bold">৳ {totalAmount.toFixed(0)}</div>
          </div>
        </div>
      </div>

      <PaymentDialog
        open={showPayment}
        onOpenChange={setShowPayment}
        totalAmount={totalAmount}
        onFinalize={handleFinalize}
        isPending={createSale.isPending || updateSale.isPending}
      />
    </div>
  );
}

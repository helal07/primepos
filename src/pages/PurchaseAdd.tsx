import { useState, useMemo, useEffect, lazy, Suspense } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Search, ArrowLeft, PackagePlus, AlertTriangle, ScanBarcode, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const BarcodeScanner = lazy(() => import("@/components/pos/BarcodeScanner"));
import { useProducts } from "@/hooks/useInventory";
import { useSuppliers } from "@/hooks/useContacts";
import { usePurchaseMutations, usePurchaseOrders, usePurchaseOrderItems, usePurchase, usePurchaseItems, type PurchaseItem } from "@/hooks/usePurchases";
import { type PaymentRow } from "@/components/payments/PaymentDialog";
import { rest } from "@/lib/restResource";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

interface PurchaseItemWithSerials extends PurchaseItem {
  serials: string[];
}

export default function PurchaseAdd() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const isEditMode = !!editId;

  const { data: products } = useProducts();
  const { data: suppliers } = useSuppliers();
  const { data: purchaseOrders } = usePurchaseOrders();
  const { createPurchase, createPurchasePayments, updatePurchase } = usePurchaseMutations();
  const { data: existingPurchase } = usePurchase(editId);
  const { data: existingItems } = usePurchaseItems(editId);

  const [supplierId, setSupplierId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [referenceNumber, setReferenceNumber] = useState(`PUR-${Date.now().toString().slice(-6)}`);
  const [supplierInvoice, setSupplierInvoice] = useState("");
  const [purchaseStatus, setPurchaseStatus] = useState("received");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PurchaseItemWithSerials[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [discountInput, setDiscountInput] = useState("");
  const [otherCharges, setOtherCharges] = useState(0);
  const [scannerIdx, setScannerIdx] = useState<number | null>(null);
  const [selectedPOId, setSelectedPOId] = useState<string>("");
  const [serialInput, setSerialInput] = useState<Record<number, string>>({});
  const [paymentRows, setPaymentRows] = useState<PaymentRow[]>([
    { amount: 0, payment_method: "cash", payment_note: "" },
  ]);
  const [editInitialized, setEditInitialized] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: "", phone: "", email: "", company: "", address: "", tax_number: "", notes: "", is_active: true });
  const [creatingSupplier, setCreatingSupplier] = useState(false);

  const handleCreateSupplier = async () => {
    if (!newSupplier.name) return;
    setCreatingSupplier(true);
    let data: any = null;
    try {
      data = await rest.create<any>("suppliers", {
        name: newSupplier.name,
        phone: newSupplier.phone || null,
        email: newSupplier.email || null,
        company: newSupplier.company || null,
        address: newSupplier.address || null,
        tax_number: newSupplier.tax_number || null,
        notes: newSupplier.notes || null,
        is_active: newSupplier.is_active,
      });
    } catch (e: any) {
      setCreatingSupplier(false);
      toast({ title: "Error", description: e?.message || "Create failed", variant: "destructive" });
      return;
    }
    setCreatingSupplier(false);
    await qc.invalidateQueries({ queryKey: ["suppliers"] });
    if (data?.id) setSupplierId(data.id);
    toast({ title: "Supplier created" });
    setSupplierDialogOpen(false);
    setNewSupplier({ name: "", phone: "", email: "", company: "", address: "", tax_number: "", notes: "", is_active: true });
  };

  // Pre-populate in edit mode
  useEffect(() => {
    if (isEditMode && existingPurchase && existingItems && !editInitialized) {
      setSupplierId(existingPurchase.supplier_id || "");
      setPurchaseDate(existingPurchase.purchase_date || new Date().toISOString().split("T")[0]);
      setReferenceNumber(existingPurchase.reference_number || "");
      setPurchaseStatus(existingPurchase.status || "received");
      setNotes(existingPurchase.notes || "");
      setOtherCharges(Number(existingPurchase.shipping_cost) || 0);

      const mapped: PurchaseItemWithSerials[] = existingItems.map((item: any) => ({
        product_id: item.product_id,
        product_name: item.products?.name || "Unknown",
        product_type: "general",
        brand_name: "",
        sku: "",
        quantity: item.quantity,
        unit_cost: Number(item.unit_cost),
        discount: Number(item.discount),
        tax_percent: Number(item.tax_percent),
        total: Number(item.total),
        serial_number: item.serial_number || "",
        serials: item.serial_number ? [item.serial_number] : [],
      }));
      setItems(mapped);
      setEditInitialized(true);
    }
  }, [isEditMode, existingPurchase, existingItems, editInitialized]);

  const { data: poItems } = usePurchaseOrderItems(selectedPOId || null);

  const handlePOSelect = (poId: string) => {
    setSelectedPOId(poId);
    if (poId && purchaseOrders) {
      const po = (purchaseOrders as any[]).find((o: any) => o.id === poId);
      if (po) {
        setSupplierId(po.supplier_id || "");
        setReferenceNumber(po.reference_number || referenceNumber);
      }
    }
  };

  useMemo(() => {
    if (poItems && poItems.length > 0 && selectedPOId) {
      const mapped: PurchaseItemWithSerials[] = poItems.map((pi: any) => ({
        product_id: pi.product_id,
        product_name: pi.products?.name || "",
        product_type: pi.products?.product_type || "general",
        brand_name: pi.products?.brands?.name || "",
        sku: pi.products?.sku || "",
        quantity: pi.quantity,
        unit_cost: Number(pi.unit_cost),
        discount: 0,
        tax_percent: Number(pi.products?.tax_percent || 0),
        total: pi.total,
        serial_number: "",
        serials: [],
      }));
      setItems(mapped);
    }
  }, [poItems, selectedPOId]);

  const handleSerialScan = (code: string, idx: number) => {
    if (!code.trim()) return;
    addSerialToItem(idx, code.trim());
    setScannerIdx(null);
  };

  const addSerialToItem = async (idx: number, serial: string) => {
    if (!serial) return;
    // Check IMEI uniqueness
    const { checkImeiUniqueness } = await import("@/hooks/useImeiValidation");
    const isUnique = await checkImeiUniqueness(serial, undefined, isEditMode ? editId! : undefined);
    if (!isUnique) return;
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      if (item.serials.includes(serial)) return item; // duplicate check
      const newSerials = [...item.serials, serial];
      const qty = newSerials.length;
      const base = qty * item.unit_cost;
      const afterDiscount = base - item.discount;
      const total = afterDiscount + afterDiscount * (item.tax_percent / 100);
      return { ...item, serials: newSerials, quantity: qty, total };
    }));
    setSerialInput(prev => ({ ...prev, [idx]: "" }));
  };

  const removeSerialFromItem = (idx: number, serial: string) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const newSerials = item.serials.filter(s => s !== serial);
      const qty = Math.max(1, newSerials.length);
      const base = qty * item.unit_cost;
      const afterDiscount = base - item.discount;
      const total = afterDiscount + afterDiscount * (item.tax_percent / 100);
      return { ...item, serials: newSerials, quantity: qty, total };
    }));
  };

  const selectedSupplier = useMemo(() => {
    if (!supplierId || !suppliers) return null;
    return (suppliers as any[]).find((s) => s.id === supplierId);
  }, [supplierId, suppliers]);

  const filteredProducts = useMemo(() => {
    if (!products || !productSearch) return [];
    const q = productSearch.toLowerCase();
    return (products as any[]).filter((p) =>
      p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [products, productSearch]);

  const hasSerialItems = items.some((i) => i.product_type === "imei" || i.product_type === "serial");

  const availablePOs = useMemo(() => {
    if (!purchaseOrders) return [];
    return (purchaseOrders as any[]).filter((po: any) => po.status === "draft" || po.status === "approved");
  }, [purchaseOrders]);

  const addProduct = (product: any) => {
    const isSerial = product.product_type === "imei" || product.product_type === "serial";
    const exists = items.find((i) => i.product_id === product.id);

    if (exists) {
      if (!isSerial) {
        // Non-serial: just increment quantity
        setItems(items.map((i) =>
          i.product_id === product.id
            ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unit_cost }
            : i
        ));
      }
      // For serial items, user adds IMEIs via the serial input field - no row duplication
    } else {
      setItems((prev) => [...prev, {
        product_id: product.id,
        product_name: product.name,
        product_type: product.product_type,
        brand_name: product.brands?.name || "",
        sku: product.sku || "",
        quantity: isSerial ? 0 : 1,
        unit_cost: Number(product.purchase_price),
        discount: 0,
        tax_percent: Number(product.tax_percent),
        total: isSerial ? 0 : Number(product.purchase_price),
        serial_number: "",
        serials: [],
      }]);
    }
    setProductSearch("");
    setShowSearch(false);
  };

  const updateItem = (idx: number, field: string, value: number | string) => {
    setItems(items.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      if (field !== "serial_number") {
        const isSerial = updated.product_type === "imei" || updated.product_type === "serial";
        const qty = isSerial ? updated.serials.length : (typeof updated.quantity === "number" ? updated.quantity : 1);
        const base = qty * updated.unit_cost;
        const afterDiscount = base - (typeof updated.discount === "number" ? updated.discount : 0);
        updated.total = afterDiscount + afterDiscount * (updated.tax_percent / 100);
        if (isSerial) updated.quantity = qty;
      }
      return updated;
    }));
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_cost, 0);
  const itemDiscount = items.reduce((s, i) => s + i.discount, 0);
  const totalTax = items.reduce((s, i) => s + (i.quantity * i.unit_cost - i.discount) * (i.tax_percent / 100), 0);

  const overallDiscount = useMemo(() => {
    if (!discountInput) return 0;
    if (discountInput.endsWith("%")) {
      const pct = parseFloat(discountInput) || 0;
      return (subtotal - itemDiscount + totalTax) * (pct / 100);
    }
    return parseFloat(discountInput) || 0;
  }, [discountInput, subtotal, itemDiscount, totalTax]);

  const grandTotal = subtotal - itemDiscount + totalTax - overallDiscount + otherCharges;
  const totalPaying = paymentRows.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const dueAmount = Math.max(0, grandTotal - totalPaying);
  const changeReturn = Math.max(0, totalPaying - grandTotal);
  const computedPaymentStatus = totalPaying >= grandTotal ? "paid" : totalPaying > 0 ? "partial" : "unpaid";
  const totalItemCount = items.reduce((s, i) => s + i.quantity, 0);

  // Check for duplicate serials across all items
  const getAllSerials = () => {
    const all: string[] = [];
    items.forEach(item => all.push(...item.serials));
    return all;
  };
  const allSerials = getAllSerials();
  const duplicateSerials = new Set(allSerials.filter((s, i) => allSerials.indexOf(s) !== i));

  const buildExpandedItems = (): PurchaseItem[] => {
    const expandedItems: PurchaseItem[] = [];
    for (const item of items) {
      const isSerial = item.product_type === "imei" || item.product_type === "serial";
      if (isSerial && item.serials.length > 0) {
        for (const serial of item.serials) {
          expandedItems.push({
            product_id: item.product_id, quantity: 1, unit_cost: item.unit_cost,
            discount: 0, tax_percent: item.tax_percent,
            total: item.unit_cost + item.unit_cost * (item.tax_percent / 100), serial_number: serial,
          });
        }
      } else {
        expandedItems.push({
          product_id: item.product_id, quantity: item.quantity, unit_cost: item.unit_cost,
          discount: item.discount, tax_percent: item.tax_percent, total: item.total,
          serial_number: item.serial_number || null,
        });
      }
    }
    return expandedItems;
  };

  const updatePaymentRow = (idx: number, field: keyof PaymentRow, value: any) => {
    setPaymentRows(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };
  const addPaymentRow = () => {
    setPaymentRows(prev => [...prev, { amount: dueAmount, payment_method: "cash", payment_note: "" }]);
  };
  const removePaymentRow = (idx: number) => {
    if (paymentRows.length <= 1) return;
    setPaymentRows(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSavePurchase = async () => {
    if (items.length === 0) return;
    const payments = paymentRows.filter(p => Number(p.amount) > 0);
    const expandedItems = buildExpandedItems();
    const formData = {
      supplier_id: supplierId || null, purchase_date: purchaseDate, reference_number: referenceNumber,
      status: purchaseStatus, subtotal, discount_amount: itemDiscount + overallDiscount,
      tax_amount: totalTax, shipping_cost: otherCharges, total_amount: grandTotal,
      payment_status: computedPaymentStatus, payment_method: payments[0]?.payment_method || "cash",
      notes, items: expandedItems,
    };

    if (isEditMode) {
      await updatePurchase.mutateAsync({ id: editId!, formData });
      await createPurchasePayments.mutateAsync({ purchaseId: editId!, payments });
      navigate(`/purchases/${editId}`);
    } else {
      const purchase = await createPurchase.mutateAsync(formData);
      await createPurchasePayments.mutateAsync({ purchaseId: purchase.id, payments });
      navigate("/purchases");
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4 pb-28">
      <PageHeader title={isEditMode ? "Edit Purchase" : "Add Purchase"} description={isEditMode ? "Edit purchase details" : "Record a new purchase from supplier"} actions={
        <Button variant="outline" size="sm" className="h-10 shrink-0" onClick={() => navigate(isEditMode ? `/purchases/${editId}` : "/purchases")}>
          <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Back</span>
        </Button>
      } />

      {/* Top Section */}
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <Label>Reference No</Label>
              <Input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} />
            </div>
            <div>
              <Label>Supplier</Label>
              <div className="flex gap-2">
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>
                    {(suppliers ?? []).map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => setSupplierDialogOpen(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {selectedSupplier && (
                <p className="text-xs text-muted-foreground mt-1">
                  Balance: <span className={selectedSupplier.balance > 0 ? "text-destructive font-medium" : "text-green-600 font-medium"}>
                    ৳{Number(selectedSupplier.balance).toLocaleString()}
                  </span>
                </p>
              )}
            </div>
            <div>
              <Label>Purchase Date</Label>
              <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
            </div>
            <div>
              <Label>Purchase Status</Label>
              <Select value={purchaseStatus} onValueChange={setPurchaseStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="received">Received (+ Stock)</SelectItem>
                  <SelectItem value="ordered">Ordered</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {purchaseStatus === "received" ? "Items added to stock immediately" : "Items NOT added to stock"}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mt-3 sm:mt-4">
            <div>
              <Label>Supplier Invoice No</Label>
              <Input value={supplierInvoice} onChange={(e) => setSupplierInvoice(e.target.value)} placeholder="Supplier invoice reference" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={1} placeholder="Optional notes" />
            </div>
            <div>
              <Label>Import from Purchase Order</Label>
              <Select value={selectedPOId} onValueChange={handlePOSelect}>
                <SelectTrigger><SelectValue placeholder="Select PO to import..." /></SelectTrigger>
                <SelectContent>
                  {availablePOs.map((po: any) => (
                    <SelectItem key={po.id} value={po.id}>
                      {po.reference_number} — {po.suppliers?.name || "No supplier"} ({po.status})
                    </SelectItem>
                  ))}
                  {availablePOs.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No pending orders</div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Section */}
      <Card>
        <CardContent className="pt-4 sm:pt-6 space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products by name or SKU..."
                value={productSearch}
                onChange={(e) => { setProductSearch(e.target.value); setShowSearch(true); }}
                onFocus={() => setShowSearch(true)}
                className="pl-9"
              />
              {showSearch && filteredProducts.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
                  {filteredProducts.map((p: any) => (
                    <button key={p.id} className="w-full text-left px-3 py-2.5 hover:bg-accent text-sm flex justify-between items-center border-b last:border-0" onClick={() => addProduct(p)}>
                      <div>
                        <span className="font-medium">{p.name}</span>
                        {p.sku && <span className="text-muted-foreground ml-2 text-xs">({p.sku})</span>}
                        {(p.product_type === "imei" || p.product_type === "serial") && (
                          <Badge variant="outline" className="ml-2 text-xs">{p.product_type.toUpperCase()}</Badge>
                        )}
                      </div>
                      <span className="text-muted-foreground">৳{Number(p.purchase_price).toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button variant="outline" className="shrink-0" onClick={() => navigate("/products/add")}>
              <PackagePlus className="h-4 w-4 mr-2" /> <span>Add Product</span>
            </Button>
          </div>

          {items.length > 0 && (
            <>
            {/* Desktop table */}
            <div className="hidden md:block rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-10">SN</TableHead>
                    <TableHead>Item / Brand / Code</TableHead>
                    {hasSerialItems && <TableHead>IMEI/Serial Numbers</TableHead>}
                    <TableHead className="w-20">Qty</TableHead>
                    <TableHead className="w-28">Unit Cost</TableHead>
                    <TableHead className="w-24">Discount</TableHead>
                    <TableHead className="w-20">Tax %</TableHead>
                    <TableHead className="w-28 text-right">Total</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => {
                    const isSerial = item.product_type === "imei" || item.product_type === "serial";
                    const hasAnyDupe = isSerial && item.serials.some(s => duplicateSerials.has(s));
                    return (
                      <TableRow key={idx} className={hasAnyDupe ? "bg-destructive/5" : ""}>
                        <TableCell className="text-muted-foreground text-center">{idx + 1}</TableCell>
                        <TableCell>
                          <div className="font-medium">{item.product_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.brand_name && <span>{item.brand_name}</span>}
                            {item.sku && <span> • {item.sku}</span>}
                            {isSerial && <Badge variant="secondary" className="ml-1 text-[10px] px-1">{item.product_type?.toUpperCase()}</Badge>}
                          </div>
                        </TableCell>
                        {hasSerialItems && (
                          <TableCell className="min-w-[250px]">
                            {isSerial ? (
                              <div className="space-y-1.5">
                                {/* Serial tags */}
                                {item.serials.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {item.serials.map((sn, si) => (
                                      <Badge
                                        key={si}
                                        variant={duplicateSerials.has(sn) ? "destructive" : "secondary"}
                                        className="text-xs font-mono pr-1 gap-1"
                                      >
                                        {sn}
                                        <button
                                          type="button"
                                          onClick={() => removeSerialFromItem(idx, sn)}
                                          className="ml-0.5 hover:bg-destructive/20 rounded-full p-0.5"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                                {/* Input for adding new serial */}
                                <div className="flex gap-1">
                                  <Input
                                    id={`serial-input-${idx}`}
                                    value={serialInput[idx] || ""}
                                    onChange={(e) => setSerialInput(prev => ({ ...prev, [idx]: e.target.value }))}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        const val = (serialInput[idx] || "").trim();
                                        if (val) addSerialToItem(idx, val);
                                      }
                                    }}
                                    placeholder={`Type ${item.product_type === "imei" ? "IMEI" : "Serial"} & press Enter`}
                                    className="h-7 text-xs font-mono"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7 shrink-0"
                                    onClick={() => setScannerIdx(idx)}
                                  >
                                    <ScanBarcode className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                                {hasAnyDupe && (
                                  <p className="text-[10px] text-destructive flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" /> Duplicate serial found
                                  </p>
                                )}
                              </div>
                            ) : <span className="text-muted-foreground text-xs">—</span>}
                          </TableCell>
                        )}
                        <TableCell>
                          <Input
                            type="number"
                            min={isSerial ? 0 : 1}
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || (isSerial ? 0 : 1))}
                            className="h-8 w-16"
                            disabled={isSerial}
                          />
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
                        <TableCell className="text-right font-semibold">৳{item.total.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeItem(idx)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {items.map((item, idx) => {
                const isSerial = item.product_type === "imei" || item.product_type === "serial";
                const hasAnyDupe = isSerial && item.serials.some(s => duplicateSerials.has(s));
                return (
                  <div key={idx} className={`rounded-lg border p-3 space-y-3 ${hasAnyDupe ? "border-destructive/50 bg-destructive/5" : "bg-card"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">{item.product_name}</div>
                        <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1">
                          {item.brand_name && <span>{item.brand_name}</span>}
                          {item.sku && <span>• {item.sku}</span>}
                          {isSerial && <Badge variant="secondary" className="text-[10px] px-1">{item.product_type?.toUpperCase()}</Badge>}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeItem(idx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {isSerial && (
                      <div className="space-y-2">
                        <Label className="text-xs">IMEI / Serial Numbers ({item.serials.length})</Label>
                        {item.serials.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.serials.map((sn, si) => (
                              <Badge key={si} variant={duplicateSerials.has(sn) ? "destructive" : "secondary"} className="text-xs font-mono pr-1 gap-1">
                                {sn}
                                <button type="button" onClick={() => removeSerialFromItem(idx, sn)} className="ml-0.5 hover:bg-destructive/20 rounded-full p-0.5">
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-1.5">
                          <Input
                            id={`m-serial-input-${idx}`}
                            value={serialInput[idx] || ""}
                            inputMode="text"
                            enterKeyHint="done"
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="characters"
                            onChange={(e) => setSerialInput(prev => ({ ...prev, [idx]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                e.stopPropagation();
                                const val = (serialInput[idx] || "").trim();
                                if (val) addSerialToItem(idx, val);
                              }
                            }}
                            onBlur={() => {
                              const val = (serialInput[idx] || "").trim();
                              if (val) setTimeout(() => addSerialToItem(idx, val), 0);
                            }}
                            placeholder="Type IMEI / Serial"
                            className="h-10 text-sm font-mono"
                          />
                          <Button
                            type="button"
                            variant="default"
                            size="icon"
                            className="h-10 w-10 shrink-0"
                            onClick={() => {
                              const val = (serialInput[idx] || "").trim();
                              if (val) addSerialToItem(idx, val);
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => setScannerIdx(idx)}>
                            <ScanBarcode className="h-4 w-4" />
                          </Button>
                        </div>
                        {hasAnyDupe && (
                          <p className="text-[11px] text-destructive flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Duplicate serial found
                          </p>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[11px] text-muted-foreground">Qty</Label>
                        <Input
                          type="number" inputMode="numeric" min={isSerial ? 0 : 1}
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || (isSerial ? 0 : 1))}
                          className="h-10" disabled={isSerial} tabIndex={isSerial ? -1 : 0}
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] text-muted-foreground">Unit Cost</Label>
                        <Input type="number" inputMode="decimal" min={0} value={item.unit_cost} onChange={(e) => updateItem(idx, "unit_cost", parseFloat(e.target.value) || 0)} className="h-10" tabIndex={isSerial ? -1 : 0} />
                      </div>
                      <div>
                        <Label className="text-[11px] text-muted-foreground">Discount</Label>
                        <Input type="number" inputMode="decimal" min={0} value={item.discount} onChange={(e) => updateItem(idx, "discount", parseFloat(e.target.value) || 0)} className="h-10" tabIndex={isSerial ? -1 : 0} />
                      </div>
                      <div>
                        <Label className="text-[11px] text-muted-foreground">Tax %</Label>
                        <Input type="number" inputMode="decimal" min={0} value={item.tax_percent} onChange={(e) => updateItem(idx, "tax_percent", parseFloat(e.target.value) || 0)} className="h-10" tabIndex={isSerial ? -1 : 0} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t pt-2">
                      <span className="text-xs text-muted-foreground">Line Total</span>
                      <span className="font-bold text-base">৳{item.total.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            </>
          )}

          {items.length === 0 && (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
              <PackagePlus className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>Search and add products above</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom — collapsible Discount & Charges / Payments / Totals */}
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          {/* One-line grand total summary */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>{totalItemCount} items</span>
              <span>Sub ৳{subtotal.toFixed(2)}</span>
              <span>Tax ৳{totalTax.toFixed(2)}</span>
              <span>Paid ৳{totalPaying.toFixed(2)}</span>
              <span className={changeReturn > 0 ? "text-green-600" : dueAmount > 0 ? "text-destructive" : "text-green-600"}>
                {changeReturn > 0 ? "Change" : "Due"} ৳{(changeReturn > 0 ? changeReturn : dueAmount).toFixed(2)}
              </span>
              <span className={`font-semibold ${computedPaymentStatus === "paid" ? "text-green-600" : computedPaymentStatus === "partial" ? "text-amber-600" : "text-destructive"}`}>
                {computedPaymentStatus === "paid" ? "Fully Paid" : computedPaymentStatus === "partial" ? "Partial" : "Credit"}
              </span>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">Grand Total</div>
              <div className="text-lg font-bold text-primary">৳{grandTotal.toFixed(2)}</div>
            </div>
          </div>

          <Accordion type="multiple" className="mt-2">
            <AccordionItem value="charges">
              <AccordionTrigger className="text-sm font-semibold">
                Discount &amp; Charges
                <span className="ml-auto mr-2 text-xs font-normal text-muted-foreground">
                  −৳{overallDiscount.toFixed(2)} / +৳{otherCharges.toFixed(2)}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Discount (৳ or %)</Label>
                    <Input className="h-10" value={discountInput} onChange={(e) => setDiscountInput(e.target.value)} placeholder="0 or 10%" />
                  </div>
                  <div>
                    <Label>Other Charges</Label>
                    <Input className="h-10" type="number" min={0} value={otherCharges} onChange={(e) => setOtherCharges(parseFloat(e.target.value) || 0)} />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="payments">
              <AccordionTrigger className="text-sm font-semibold">
                Payments
                <span className="ml-auto mr-2 text-xs font-normal text-muted-foreground">
                  {paymentRows.filter(p => Number(p.amount) > 0).length} entr{paymentRows.filter(p => Number(p.amount) > 0).length === 1 ? "y" : "ies"} • ৳{totalPaying.toFixed(2)}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  {paymentRows.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-2 gap-2 md:flex md:gap-2 md:items-end border md:border-0 rounded-lg p-2 md:p-0">
                      <div className="md:w-32">
                        {idx === 0 && <Label className="text-xs">Amount</Label>}
                        <Input
                          className="h-10"
                          type="number" inputMode="decimal"
                          min={0}
                          value={row.amount}
                          onChange={(e) => updatePaymentRow(idx, "amount", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="md:w-36">
                        {idx === 0 && <Label className="text-xs">Method</Label>}
                        <Select value={row.payment_method} onValueChange={(v) => updatePaymentRow(idx, "payment_method", v)}>
                          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="card">Card</SelectItem>
                            <SelectItem value="bkash">bKash</SelectItem>
                            <SelectItem value="bank">Bank</SelectItem>
                            <SelectItem value="cheque">Cheque</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2 md:flex-1">
                        {idx === 0 && <Label className="text-xs">Note</Label>}
                        <Input
                          className="h-10"
                          value={row.payment_note}
                          onChange={(e) => updatePaymentRow(idx, "payment_note", e.target.value)}
                          placeholder="Optional note"
                        />
                      </div>
                      {paymentRows.length > 1 && (
                        <Button variant="ghost" size="icon" className="text-destructive shrink-0 col-span-2 md:col-span-1 justify-self-end" onClick={() => removePaymentRow(idx)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addPaymentRow} className="w-full">
                    <Plus className="h-4 w-4 mr-2" /> Add Payment Row
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="totals" className="border-b-0">
              <AccordionTrigger className="text-sm font-semibold">Totals breakdown</AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4 items-end">
                  <div>
                    <Label className="text-xs text-muted-foreground">Total Items</Label>
                    <div className="text-base sm:text-lg font-bold">{totalItemCount}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Subtotal</Label>
                    <div className="text-base sm:text-lg font-bold">৳{subtotal.toFixed(2)}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Tax</Label>
                    <div className="text-base sm:text-lg font-bold">৳{totalTax.toFixed(2)}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Grand Total</Label>
                    <div className="text-lg sm:text-xl font-bold text-primary">৳{grandTotal.toFixed(2)}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Paid</Label>
                    <div className="text-lg sm:text-xl font-bold text-primary">৳{totalPaying.toFixed(2)}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{changeReturn > 0 ? "Change" : "Due"}</Label>
                    <div className={`text-lg sm:text-xl font-bold ${changeReturn > 0 ? "text-green-600" : dueAmount > 0 ? "text-destructive" : "text-green-600"}`}>
                      ৳{(changeReturn > 0 ? changeReturn : dueAmount).toFixed(2)}
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Sticky save bar — single primary action on every breakpoint */}
      <div className="fixed bottom-16 md:bottom-0 inset-x-0 md:left-[var(--sidebar-width,0px)] z-30 border-t bg-background/95 backdrop-blur p-3 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-muted-foreground leading-none">Grand Total</div>
          <div className="text-base font-bold text-primary truncate">৳{grandTotal.toFixed(2)}</div>
        </div>
        <Button variant="outline" className="h-11 hidden sm:inline-flex" onClick={() => navigate(isEditMode ? `/purchases/${editId}` : "/purchases")}>
          Cancel
        </Button>
        <Button
          className="flex-1 sm:flex-none sm:min-w-[200px] h-11"
          disabled={items.length === 0 || createPurchase.isPending || updatePurchase.isPending || duplicateSerials.size > 0}
          onClick={handleSavePurchase}
        >
          {createPurchase.isPending || updatePurchase.isPending ? "Saving..." : (isEditMode ? "Update Purchase" : "Save Purchase")}
        </Button>
      </div>


      {/* Barcode Scanner Dialog */}
      <Dialog open={scannerIdx !== null} onOpenChange={(o) => !o && setScannerIdx(null)}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-md max-h-[92vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Scan IMEI / Serial</DialogTitle>
          </DialogHeader>
          <Suspense fallback={<div className="text-center py-8">Loading scanner...</div>}>
            {scannerIdx !== null && (
              <BarcodeScanner
                onScan={(code) => handleSerialScan(code, scannerIdx)}
                onClose={() => setScannerIdx(null)}
              />
            )}
          </Suspense>
        </DialogContent>
      </Dialog>

      {/* Quick Add Supplier Dialog */}
      <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Supplier</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label>Name *</Label>
                <Input value={newSupplier.name} onChange={e => setNewSupplier({ ...newSupplier, name: e.target.value })} placeholder="Supplier name" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={newSupplier.phone} onChange={e => setNewSupplier({ ...newSupplier, phone: e.target.value })} placeholder="+880..." />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={newSupplier.email} onChange={e => setNewSupplier({ ...newSupplier, email: e.target.value })} placeholder="email@example.com" />
              </div>
              <div className="space-y-2">
                <Label>Company</Label>
                <Input value={newSupplier.company} onChange={e => setNewSupplier({ ...newSupplier, company: e.target.value })} placeholder="Company name" />
              </div>
              <div className="space-y-2">
                <Label>Tax Number</Label>
                <Input value={newSupplier.tax_number} onChange={e => setNewSupplier({ ...newSupplier, tax_number: e.target.value })} placeholder="TIN / VAT" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea value={newSupplier.address} onChange={e => setNewSupplier({ ...newSupplier, address: e.target.value })} rows={2} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={newSupplier.is_active} onCheckedChange={v => setNewSupplier({ ...newSupplier, is_active: v })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSupplierDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateSupplier} disabled={!newSupplier.name || creatingSupplier}>
              {creatingSupplier ? "Creating..." : "Create Supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

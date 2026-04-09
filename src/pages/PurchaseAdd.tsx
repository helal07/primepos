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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Search, ArrowLeft, PackagePlus, AlertTriangle, ScanBarcode, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const BarcodeScanner = lazy(() => import("@/components/pos/BarcodeScanner"));
import { useProducts } from "@/hooks/useInventory";
import { useSuppliers } from "@/hooks/useContacts";
import { usePurchaseMutations, usePurchaseOrders, usePurchaseOrderItems, usePurchase, usePurchaseItems, type PurchaseItem } from "@/hooks/usePurchases";
import { PaymentDialog, type PaymentRow } from "@/components/payments/PaymentDialog";

interface PurchaseItemWithSerials extends PurchaseItem {
  serials: string[];
}

export default function PurchaseAdd() {
  const navigate = useNavigate();
  const { data: products } = useProducts();
  const { data: suppliers } = useSuppliers();
  const { data: purchaseOrders } = usePurchaseOrders();
  const { createPurchase } = usePurchaseMutations();

  const [supplierId, setSupplierId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [referenceNumber, setReferenceNumber] = useState(`PUR-${Date.now().toString().slice(-6)}`);
  const [supplierInvoice, setSupplierInvoice] = useState("");
  const [purchaseStatus, setPurchaseStatus] = useState("received");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentStatus, setPaymentStatus] = useState("unpaid");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PurchaseItemWithSerials[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [discountInput, setDiscountInput] = useState("");
  const [otherCharges, setOtherCharges] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [scannerIdx, setScannerIdx] = useState<number | null>(null);
  const [selectedPOId, setSelectedPOId] = useState<string>("");
  const [serialInput, setSerialInput] = useState<Record<number, string>>({});

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

  const addSerialToItem = (idx: number, serial: string) => {
    if (!serial) return;
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
  const dueAmount = Math.max(0, grandTotal - paidAmount);
  const totalItemCount = items.reduce((s, i) => s + i.quantity, 0);

  // Check for duplicate serials across all items
  const getAllSerials = () => {
    const all: string[] = [];
    items.forEach(item => all.push(...item.serials));
    return all;
  };
  const allSerials = getAllSerials();
  const duplicateSerials = new Set(allSerials.filter((s, i) => allSerials.indexOf(s) !== i));

  const handleSubmit = async () => {
    if (items.length === 0) return;

    // For serial items, expand each serial into its own purchase_item row
    const expandedItems: PurchaseItem[] = [];
    for (const item of items) {
      const isSerial = item.product_type === "imei" || item.product_type === "serial";
      if (isSerial && item.serials.length > 0) {
        for (const serial of item.serials) {
          expandedItems.push({
            product_id: item.product_id,
            quantity: 1,
            unit_cost: item.unit_cost,
            discount: 0,
            tax_percent: item.tax_percent,
            total: item.unit_cost + item.unit_cost * (item.tax_percent / 100),
            serial_number: serial,
          });
        }
      } else {
        expandedItems.push({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          discount: item.discount,
          tax_percent: item.tax_percent,
          total: item.total,
          serial_number: item.serial_number || null,
        });
      }
    }

    await createPurchase.mutateAsync({
      supplier_id: supplierId || null,
      purchase_date: purchaseDate,
      reference_number: referenceNumber,
      status: purchaseStatus,
      subtotal,
      discount_amount: itemDiscount + overallDiscount,
      tax_amount: totalTax,
      shipping_cost: otherCharges,
      total_amount: grandTotal,
      payment_status: paidAmount >= grandTotal ? "paid" : paidAmount > 0 ? "partial" : "unpaid",
      payment_method: paymentMethod,
      notes,
      items: expandedItems,
    });
    navigate("/purchases");
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Add Purchase" description="Record a new purchase from supplier" actions={
        <Button variant="outline" onClick={() => navigate("/purchases")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
      } />

      {/* Top Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <Button variant="outline" size="icon" onClick={() => navigate("/suppliers")}>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
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
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-3">
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
            <Button variant="outline" onClick={() => navigate("/products/add")}>
              <PackagePlus className="h-4 w-4 mr-2" /> Add Product
            </Button>
          </div>

          {items.length > 0 && (
            <div className="rounded-md border overflow-x-auto">
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
          )}

          {items.length === 0 && (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
              <PackagePlus className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>Search and add products above</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom — Payment & Totals */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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
              <Label>Paid Amount</Label>
              <Input type="number" min={0} value={paidAmount} onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Discount (৳ or %)</Label>
              <Input value={discountInput} onChange={(e) => setDiscountInput(e.target.value)} placeholder="0 or 10%" />
            </div>
            <div>
              <Label>Other Charges</Label>
              <Input type="number" min={0} value={otherCharges} onChange={(e) => setOtherCharges(parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          <Separator className="my-4" />

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
            <div>
              <Label className="text-xs text-muted-foreground">Total Items</Label>
              <div className="text-lg font-bold">{totalItemCount}</div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Subtotal</Label>
              <div className="text-lg font-bold">৳{subtotal.toFixed(2)}</div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Tax</Label>
              <div className="text-lg font-bold">৳{totalTax.toFixed(2)}</div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Grand Total</Label>
              <div className="text-xl font-bold text-primary">৳{grandTotal.toFixed(2)}</div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Due</Label>
              <div className={`text-xl font-bold ${dueAmount > 0 ? "text-destructive" : "text-green-600"}`}>
                ৳{dueAmount.toFixed(2)}
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => navigate("/purchases")}>Cancel</Button>
            <Button
              size="lg"
              disabled={items.length === 0 || createPurchase.isPending || duplicateSerials.size > 0}
              onClick={handleSubmit}
            >
              {createPurchase.isPending ? "Saving..." : "Save Purchase"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Barcode Scanner Dialog */}
      <Dialog open={scannerIdx !== null} onOpenChange={(o) => !o && setScannerIdx(null)}>
        <DialogContent className="max-w-md">
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
    </div>
  );
}

import { useState, useMemo, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
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
import { Plus, Trash2, Search, ArrowLeft, PackagePlus, AlertTriangle, ScanBarcode } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const BarcodeScanner = lazy(() => import("@/components/pos/BarcodeScanner"));
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
  const [referenceNumber, setReferenceNumber] = useState(`PUR-${Date.now().toString().slice(-6)}`);
  const [supplierInvoice, setSupplierInvoice] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentStatus, setPaymentStatus] = useState("unpaid");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [discountInput, setDiscountInput] = useState("");
  const [otherCharges, setOtherCharges] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [scannerIdx, setScannerIdx] = useState<number | null>(null);

  const handleSerialScan = (code: string, idx: number) => {
    updateItem(idx, "serial_number", code);
    setScannerIdx(null);
    // Auto-add next row
    const product = (products as any[])?.find((p: any) => p.id === items[idx]?.product_id);
    if (product) {
      addProduct(product);
      setTimeout(() => {
        document.getElementById(`serial-input-${idx + 1}`)?.focus();
      }, 50);
    }
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

  const addProduct = (product: any) => {
    const isSerial = product.product_type === "imei" || product.product_type === "serial";

    if (isSerial) {
      // Always add a new row for serial/IMEI products (qty locked to 1)
      setItems((prev) => [...prev, {
        product_id: product.id,
        product_name: product.name,
        product_type: product.product_type,
        brand_name: product.brands?.name || "",
        sku: product.sku || "",
        quantity: 1,
        unit_cost: Number(product.purchase_price),
        discount: 0,
        tax_percent: Number(product.tax_percent),
        total: Number(product.purchase_price),
        serial_number: "",
      }]);
    } else {
      const exists = items.find((i) => i.product_id === product.id);
      if (exists) {
        setItems(items.map((i) =>
          i.product_id === product.id
            ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unit_cost }
            : i
        ));
      } else {
        setItems((prev) => [...prev, {
          product_id: product.id,
          product_name: product.name,
          product_type: product.product_type,
          brand_name: product.brands?.name || "",
          sku: product.sku || "",
          quantity: 1,
          unit_cost: Number(product.purchase_price),
          discount: 0,
          tax_percent: Number(product.tax_percent),
          total: Number(product.purchase_price),
        }]);
      }
    }
    setProductSearch("");
    setShowSearch(false);
  };

  const updateItem = (idx: number, field: string, value: number | string) => {
    setItems(items.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      if (field !== "serial_number") {
        const qty = typeof updated.quantity === "number" ? updated.quantity : 1;
        const base = qty * updated.unit_cost;
        const afterDiscount = base - (typeof updated.discount === "number" ? updated.discount : 0);
        updated.total = afterDiscount + afterDiscount * (updated.tax_percent / 100);
      }
      return updated;
    }));
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  // Calculate totals
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_cost, 0);
  const itemDiscount = items.reduce((s, i) => s + i.discount, 0);
  const totalTax = items.reduce((s, i) => s + (i.quantity * i.unit_cost - i.discount) * (i.tax_percent / 100), 0);

  // Parse discount input — supports "10" (flat) or "10%" (percentage)
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

  const handleSubmit = async () => {
    if (items.length === 0) return;
    await createPurchase.mutateAsync({
      supplier_id: supplierId || null,
      purchase_date: purchaseDate,
      reference_number: referenceNumber,
      status: "pending",
      subtotal,
      discount_amount: itemDiscount + overallDiscount,
      tax_amount: totalTax,
      shipping_cost: otherCharges,
      total_amount: grandTotal,
      payment_status: paidAmount >= grandTotal ? "paid" : paidAmount > 0 ? "partial" : "unpaid",
      payment_method: paymentMethod,
      notes,
      items,
    });
    navigate("/purchases");
  };

  // Check for duplicate serials
  const getDuplicateSerials = () => {
    const serials = items.filter((i) => i.serial_number).map((i) => i.serial_number!);
    const seen = new Set<string>();
    const dupes = new Set<string>();
    for (const s of serials) {
      if (s && seen.has(s)) dupes.add(s);
      seen.add(s);
    }
    return dupes;
  };
  const duplicateSerials = getDuplicateSerials();

  return (
    <div className="space-y-4">
      <PageHeader title="Add Purchase" description="Record a new purchase from supplier" actions={
        <Button variant="outline" onClick={() => navigate("/purchases")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
      } />

      {/* Top Section — Reference, Supplier, Date */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <Label>Supplier Invoice No</Label>
              <Input value={supplierInvoice} onChange={(e) => setSupplierInvoice(e.target.value)} placeholder="Supplier invoice reference" />
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
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={1} placeholder="Optional notes" />
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
                    {hasSerialItems && <TableHead className="w-40">IMEI/Serial</TableHead>}
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
                    const isDupe = isSerial && item.serial_number && duplicateSerials.has(item.serial_number);
                    return (
                      <TableRow key={idx} className={isDupe ? "bg-destructive/5" : ""}>
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
                          <TableCell>
                            {isSerial ? (
                              <div>
                                <div className="flex gap-1">
                                  <Input
                                    id={`serial-input-${idx}`}
                                    value={item.serial_number || ""}
                                    onChange={(e) => updateItem(idx, "serial_number", e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && item.serial_number?.trim()) {
                                        e.preventDefault();
                                        const product = (products as any[])?.find((p: any) => p.id === item.product_id);
                                        if (product) {
                                          addProduct(product);
                                          setTimeout(() => {
                                            document.getElementById(`serial-input-${idx + 1}`)?.focus();
                                          }, 50);
                                        }
                                      }
                                    }}
                                    placeholder={item.product_type === "imei" ? "IMEI" : "Serial"}
                                    className={`h-8 text-sm ${isDupe ? "border-destructive" : ""}`}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 shrink-0"
                                    onClick={() => setScannerIdx(idx)}
                                    title="Scan barcode"
                                  >
                                    <ScanBarcode className="h-4 w-4" />
                                  </Button>
                                </div>
                                {isDupe && (
                                  <p className="text-[10px] text-destructive flex items-center gap-1 mt-0.5">
                                    <AlertTriangle className="h-3 w-3" /> Duplicate
                                  </p>
                                )}
                              </div>
                            ) : <span className="text-muted-foreground text-xs">—</span>}
                          </TableCell>
                        )}
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)}
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

      {/* Bottom Totals */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 items-end">
            <div>
              <Label className="text-xs text-muted-foreground">Total Items</Label>
              <div className="text-lg font-bold">{totalItemCount}</div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Subtotal</Label>
              <div className="text-lg font-bold">৳{subtotal.toFixed(2)}</div>
            </div>
            <div>
              <Label className="text-xs">Discount (₹ or %)</Label>
              <Input value={discountInput} onChange={(e) => setDiscountInput(e.target.value)} placeholder="0 or 10%" className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Other Charges</Label>
              <Input type="number" min={0} value={otherCharges} onChange={(e) => setOtherCharges(parseFloat(e.target.value) || 0)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Grand Total</Label>
              <div className="text-xl font-bold text-primary">৳{grandTotal.toFixed(2)}</div>
            </div>
            <div>
              <Label className="text-xs">Paid Amount</Label>
              <Input type="number" min={0} value={paidAmount} onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)} className="h-9" />
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
    </div>
  );
}

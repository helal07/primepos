import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, ArrowLeft, Plus, Minus, X, Save, Printer, ChevronDown, ChevronUp } from "lucide-react";
import { useProducts } from "@/hooks/useInventory";
import { useCustomers } from "@/hooks/useContacts";
import { useQuery } from "@tanstack/react-query";
import { rest } from "@/lib/restResource";
import { useSale, useSaleItems, useSaleMutations, type SaleItem } from "@/hooks/useSales";
import { toast } from "sonner";

function useWarranties() {
  return useQuery({
    queryKey: ["warranties", "active"],
    queryFn: async () => {
      return await rest.all<{ id: string; name: string; duration: number; duration_type: string }>(
        "warranties", { filter: { is_active: true }, perPage: 500 }
      );
    },
  });
}

function useDeliveryPeople() {
  return useQuery({
    queryKey: ["delivery_people", "current_tenant"],
    queryFn: async () => {
      const { rest } = await import("@/lib/restResource");
      const me = await import("@/lib/apiClient").then(m =>
        m.api.get<{ user: { tenant_id?: string | null } }>("/api/auth/me").catch(() => null)
      );
      const tenantId = me?.user?.tenant_id;
      if (!tenantId) return [];
      const rows = await rest.all<{ user_id: string; display_name: string | null }>(
        "profiles",
        { filter: { tenant_id: tenantId }, perPage: 500 }
      );
      return rows;
    },
  });
}

export default function SalesOrderAdd() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const isEditMode = !!editId;

  const { data: products } = useProducts();
  const { data: customers } = useCustomers();
  const { data: warranties } = useWarranties();
  const { data: deliveryPeople } = useDeliveryPeople();
  const { createSale, updateSale } = useSaleMutations();

  const { data: existingSale } = useSale(editId);
  const { data: existingItems } = useSaleItems(editId);

  const [customerId, setCustomerId] = useState<string>("");
  const [payTermNumber, setPayTermNumber] = useState<string>("");
  const [payTermUnit, setPayTermUnit] = useState<string>("");
  const [orderNo, setOrderNo] = useState<string>("");
  const [saleDate, setSaleDate] = useState<string>(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [sellNote, setSellNote] = useState("");
  const [shippingDetails, setShippingDetails] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingCharges, setShippingCharges] = useState(0);
  const [shippingStatus, setShippingStatus] = useState<string>("");
  const [deliveredTo, setDeliveredTo] = useState("");
  const [deliveryPersonId, setDeliveryPersonId] = useState<string>("");
  const [productSearch, setProductSearch] = useState("");
  const [items, setItems] = useState<SaleItem[]>([]);
  const [showExpenses, setShowExpenses] = useState(false);
  const [expenses, setExpenses] = useState<{ name: string; amount: number }[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Pre-populate in edit mode
  useEffect(() => {
    if (isEditMode && existingSale && existingItems && !initialized) {
      const s: any = existingSale;
      setCustomerId(s.customer_id || "");
      setPayTermNumber(s.pay_term_number != null ? String(s.pay_term_number) : "");
      setPayTermUnit(s.pay_term_unit || "");
      setOrderNo(s.order_no || "");
      if (s.sale_date) {
        const d = new Date(s.sale_date);
        const pad = (n: number) => String(n).padStart(2, "0");
        setSaleDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
      }
      setSellNote(s.notes || "");
      setShippingDetails(s.shipping_details || "");
      setShippingAddress(s.shipping_address || "");
      setShippingCharges(Number(s.shipping_cost) || 0);
      setShippingStatus(s.shipping_status || "");
      setDeliveredTo(s.delivered_to || "");
      setDeliveryPersonId(s.delivery_person_id || "");
      setExpenses(Array.isArray(s.additional_expenses) ? s.additional_expenses : []);
      setItems(
        existingItems.map((it: any) => ({
          product_id: it.product_id,
          product_name: it.products?.name || "Unknown",
          variation_id: it.variation_id,
          quantity: it.quantity,
          unit_price: Number(it.unit_price),
          discount: Number(it.discount),
          discount_type: it.discount_type || "fixed",
          tax_percent: Number(it.tax_percent),
          total: Number(it.total),
          serial_number: it.serial_number,
          imei_text: it.imei_text,
          warranty_id: it.warranty_id,
          warranty_name: it.warranty_name,
          unit: it.unit,
        }))
      );
      setInitialized(true);
    }
  }, [isEditMode, existingSale, existingItems, initialized]);

  const customer = useMemo(
    () => (customers ?? []).find((c: any) => c.id === customerId) as any,
    [customers, customerId]
  );

  const filteredProducts = useMemo(() => {
    if (!products || !productSearch) return [];
    const q = productSearch.toLowerCase();
    return (products as any[])
      .filter((p) => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.barcode?.toLowerCase().includes(q))
      .slice(0, 10);
  }, [products, productSearch]);

  const calcTotal = (it: SaleItem) => {
    const qty = Number(it.quantity);
    const price = Number(it.unit_price);
    const disc = Number(it.discount);
    const tax = Number(it.tax_percent);
    const lineDisc = it.discount_type === "percentage" ? price * qty * (disc / 100) : disc * qty;
    const lineNet = qty * price - lineDisc;
    return lineNet * (1 + tax / 100);
  };

  const addProduct = (product: any) => {
    const exists = items.find((i) => i.product_id === product.id);
    if (exists) {
      setItems(items.map((i) => i.product_id === product.id
        ? { ...i, quantity: i.quantity + 1, total: calcTotal({ ...i, quantity: i.quantity + 1 }) }
        : i));
    } else {
      const base = Number(product.selling_price);
      const tax = Number(product.tax_percent || 0);
      const newItem: SaleItem = {
        product_id: product.id, product_name: product.name,
        quantity: 1, unit_price: base, discount: 0, discount_type: "fixed",
        tax_percent: tax, total: base * (1 + tax / 100), unit: "Pc",
      };
      setItems([...items, newItem]);
    }
    setProductSearch("");
  };

  const updateItem = (idx: number, field: keyof SaleItem, value: any) => {
    setItems(items.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, [field]: value } as SaleItem;
      updated.total = calcTotal(updated);
      return updated;
    }));
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const subtotal = items.reduce((s, i) => s + Number(i.total), 0);
  const expensesTotal = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalPayable = subtotal + Number(shippingCharges || 0) + expensesTotal;

  const buildFormData = (status: string) => ({
    customer_id: customerId || null,
    sale_date: new Date(saleDate).toISOString(),
    status,
    subtotal,
    discount_type: "fixed",
    discount_value: 0,
    discount_amount: items.reduce((s, i) => {
      const d = Number(i.discount);
      return s + (i.discount_type === "percentage" ? Number(i.unit_price) * Number(i.quantity) * (d / 100) : d * Number(i.quantity));
    }, 0),
    tax_amount: items.reduce((s, i) => {
      const lineDisc = i.discount_type === "percentage"
        ? Number(i.unit_price) * Number(i.quantity) * (Number(i.discount) / 100)
        : Number(i.discount) * Number(i.quantity);
      const net = Number(i.unit_price) * Number(i.quantity) - lineDisc;
      return s + net * (Number(i.tax_percent) / 100);
    }, 0),
    shipping_cost: Number(shippingCharges || 0),
    total_amount: totalPayable,
    payment_method: "cash",
    payment_status: "unpaid",
    notes: sellNote || undefined,
    items,
    pay_term_number: payTermNumber ? Number(payTermNumber) : null,
    pay_term_unit: payTermUnit || null,
    order_no: orderNo || null,
    shipping_details: shippingDetails || null,
    shipping_address: shippingAddress || null,
    shipping_status: shippingStatus || null,
    delivered_to: deliveredTo || null,
    delivery_person_id: deliveryPersonId || null,
    additional_expenses: expenses,
  });

  const handleSave = async (andPrint: boolean) => {
    if (items.length === 0) {
      toast.error("Add at least one product");
      return;
    }
    const formData = buildFormData("order");
    if (isEditMode) {
      await updateSale.mutateAsync({ id: editId!, formData: formData as any });
      if (andPrint) window.print();
      navigate(`/sales/${editId}`);
    } else {
      const sale = await createSale.mutateAsync(formData as any);
      if (andPrint) window.print();
      navigate(`/sales/${sale.id}`);
    }
  };

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/sales/orders")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold">{isEditMode ? "Edit Sales Order" : "Add Sales Order"}</h1>
      </div>

      {/* Header info */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs">Customer:*</Label>
            <Select value={customerId || "walk-in"} onValueChange={(v) => setCustomerId(v === "walk-in" ? "" : v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="walk-in">Walk-in Customer</SelectItem>
                {(customers ?? []).map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}{c.phone ? ` (${c.phone})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {customer && (
              <div className="mt-2 text-xs text-muted-foreground space-y-1">
                <div>
                  <span className="font-semibold text-foreground">Billing Address:</span><br />
                  {customer.name}{customer.phone ? `, ${customer.phone}` : ""}<br />
                  {customer.address || "—"}
                </div>
                {customer.balance != null && Number(customer.balance) !== 0 && (
                  <div className="text-destructive font-semibold">Customer Due: ৳ {Number(customer.balance).toLocaleString()}</div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-xs">Pay term:</Label>
              <div className="flex gap-2">
                <Input type="number" placeholder="Pay term" value={payTermNumber} onChange={(e) => setPayTermNumber(e.target.value)} className="h-9" />
                <Select value={payTermUnit || "none"} onValueChange={(v) => setPayTermUnit(v === "none" ? "" : v)}>
                  <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Please Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Please Select</SelectItem>
                    <SelectItem value="months">Months</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Order No.</Label>
              <Input placeholder="Keep blank to auto generate" value={orderNo} onChange={(e) => setOrderNo(e.target.value)} className="h-9" />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-xs">Sale Date:*</Label>
              <Input type="datetime-local" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} className="h-9" />
            </div>
          </div>
        </div>
      </Card>

      {/* Items table */}
      <Card className="p-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-10">#</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="w-[160px] text-center">Quantity</TableHead>
                <TableHead className="w-[120px] text-right">Unit Price</TableHead>
                <TableHead className="w-[140px]">Discount</TableHead>
                <TableHead className="w-[150px]">Warranty</TableHead>
                <TableHead className="w-[100px] text-right">Subtotal</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">No products added. Use the search below.</TableCell></TableRow>
              ) : items.map((item, idx) => (
                <TableRow key={idx} className="align-top">
                  <TableCell className="pt-3">{idx + 1}</TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{item.product_name}</div>
                    <Textarea
                      placeholder="Add product IMEI, Serial number or other informations here."
                      value={item.imei_text || ""}
                      onChange={(e) => updateItem(idx, "imei_text", e.target.value)}
                      className="mt-2 text-xs h-16 resize-none"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateItem(idx, "quantity", Math.max(1, item.quantity - 1))}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input type="number" min={1} value={item.quantity} onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)} className="h-8 w-16 text-center" />
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateItem(idx, "quantity", item.quantity + 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <Select value={item.unit || "Pc"} onValueChange={(v) => updateItem(idx, "unit", v)}>
                      <SelectTrigger className="h-8 mt-2"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pc">Piece</SelectItem>
                        <SelectItem value="Box">Box</SelectItem>
                        <SelectItem value="Kg">Kg</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input type="number" min={0} value={item.unit_price} onChange={(e) => updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)} className="h-8 text-right" />
                  </TableCell>
                  <TableCell>
                    <Input type="number" min={0} value={item.discount} onChange={(e) => updateItem(idx, "discount", parseFloat(e.target.value) || 0)} className="h-8" />
                    <Select value={item.discount_type || "fixed"} onValueChange={(v) => updateItem(idx, "discount_type", v)}>
                      <SelectTrigger className="h-8 mt-2"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed</SelectItem>
                        <SelectItem value="percentage">Percentage</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={item.warranty_id || "none"}
                      onValueChange={(v) => {
                        if (v === "none") {
                          updateItem(idx, "warranty_id", null);
                          updateItem(idx, "warranty_name", null);
                        } else {
                          const w = (warranties ?? []).find((x) => x.id === v);
                          setItems(items.map((it, i) => i === idx ? { ...it, warranty_id: v, warranty_name: w ? `${w.name} (${w.duration} ${w.duration_type})` : null, total: calcTotal(it) } : it));
                        }
                      }}
                    >
                      <SelectTrigger className="h-8"><SelectValue placeholder="Please Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Please Select</SelectItem>
                        {(warranties ?? []).map((w) => (
                          <SelectItem key={w.id} value={w.id}>{w.name} ({w.duration} {w.duration_type})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right font-semibold pt-3">৳ {item.total.toFixed(0)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(idx)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-end gap-6 mt-3 text-sm">
          <span><span className="text-muted-foreground">Items: </span><span className="font-semibold">{items.length}</span></span>
          <span><span className="text-muted-foreground">Total: </span><span className="font-semibold">{subtotal.toFixed(0)}</span></span>
        </div>

        {/* Product search */}
        <div className="mt-4 relative">
          <div className="flex">
            <div className="flex items-center px-3 border border-r-0 rounded-l-md bg-muted">
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              placeholder="Enter Product name / SKU / Scan bar code"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="rounded-l-none rounded-r-none"
            />
            <Button variant="default" className="rounded-l-none">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {filteredProducts.length > 0 && (
            <div className="absolute z-10 left-0 right-0 mt-1 bg-popover border rounded-md shadow-md max-h-72 overflow-auto">
              {filteredProducts.map((p: any) => (
                <button key={p.id} onClick={() => addProduct(p)} className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex justify-between items-center">
                  <span>{p.name} {p.sku && <span className="text-xs text-muted-foreground">({p.sku})</span>}</span>
                  <span className="text-xs text-muted-foreground">৳{Number(p.selling_price).toLocaleString()} · Stk {p.stock_quantity ?? 0}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Sell note */}
      <Card className="p-4">
        <Label className="text-xs">Sell note</Label>
        <Textarea value={sellNote} onChange={(e) => setSellNote(e.target.value)} className="mt-1" />
      </Card>

      {/* Shipping */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs">Shipping Details</Label>
            <Textarea value={shippingDetails} onChange={(e) => setShippingDetails(e.target.value)} className="mt-1 h-20" />
          </div>
          <div>
            <Label className="text-xs">Shipping Address</Label>
            <Textarea value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} className="mt-1 h-20" />
          </div>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Shipping Charges</Label>
              <Input type="number" min={0} value={shippingCharges} onChange={(e) => setShippingCharges(parseFloat(e.target.value) || 0)} className="h-9 mt-1" />
            </div>
            <div>
              <Label className="text-xs">Delivery Person</Label>
              <Select value={deliveryPersonId || "none"} onValueChange={(v) => setDeliveryPersonId(v === "none" ? "" : v)}>
                <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="Please Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Please Select</SelectItem>
                  {(deliveryPeople ?? []).map((p) => (
                    <SelectItem key={p.user_id} value={p.user_id}>{p.display_name || "Unnamed"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Shipping Status</Label>
            <Select value={shippingStatus || "none"} onValueChange={(v) => setShippingStatus(v === "none" ? "" : v)}>
              <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="Please Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Please Select</SelectItem>
                <SelectItem value="ordered">Ordered</SelectItem>
                <SelectItem value="packed">Packed</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Delivered To:</Label>
            <Input value={deliveredTo} onChange={(e) => setDeliveredTo(e.target.value)} className="h-9 mt-1" />
          </div>
        </div>

        {/* Additional expenses */}
        <div className="mt-4 flex flex-col items-center">
          <Button variant="secondary" type="button" onClick={() => setShowExpenses((v) => !v)} className="gap-1">
            <Plus className="h-4 w-4" /> Add additional expenses {showExpenses ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          {showExpenses && (
            <div className="w-full mt-3 space-y-2">
              {expenses.map((e, i) => (
                <div key={i} className="flex gap-2">
                  <Input placeholder="Expense name" value={e.name} onChange={(ev) => setExpenses(expenses.map((x, j) => j === i ? { ...x, name: ev.target.value } : x))} />
                  <Input type="number" placeholder="Amount" value={e.amount} onChange={(ev) => setExpenses(expenses.map((x, j) => j === i ? { ...x, amount: parseFloat(ev.target.value) || 0 } : x))} className="w-40" />
                  <Button variant="ghost" size="icon" onClick={() => setExpenses(expenses.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setExpenses([...expenses, { name: "", amount: 0 }])}>+ Add expense</Button>
            </div>
          )}
          <div className="mt-3 text-right w-full">
            <span className="text-sm text-muted-foreground">Total Payable: </span>
            <span className="font-bold">{totalPayable.toFixed(0)}</span>
          </div>
        </div>
      </Card>

      {/* Action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t p-3 flex items-center justify-center gap-3 z-30 print:hidden">
        <Button onClick={() => handleSave(false)} disabled={createSale.isPending || updateSale.isPending} className="bg-primary">
          <Save className="h-4 w-4 mr-2" /> Save
        </Button>
        <Button onClick={() => handleSave(true)} disabled={createSale.isPending || updateSale.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Printer className="h-4 w-4 mr-2" /> Save and print
        </Button>
      </div>
    </div>
  );
}
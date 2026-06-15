import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Search, ArrowLeft } from "lucide-react";
import { useProducts } from "@/hooks/useInventory";
import { useSuppliers } from "@/hooks/useContacts";
import { rest } from "@/lib/restResource";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface POItem {
  product_id: string;
  product_name: string;
  sku?: string;
  quantity: number;
  unit_cost: number;
  total: number;
}

export default function PurchaseOrderAdd() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const isEdit = !!editId;

  const { data: products } = useProducts();
  const { data: suppliers } = useSuppliers();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [supplierId, setSupplierId] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0]);
  const [expectedDate, setExpectedDate] = useState("");
  const [referenceNumber, setReferenceNumber] = useState(`PO-${Date.now().toString().slice(-6)}`);
  const [status, setStatus] = useState("draft");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<POItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      const po = await rest.get<any>("purchase_orders", editId!).catch(() => null);
      if (po) {
        setSupplierId(po.supplier_id || "");
        setOrderDate(po.order_date);
        setExpectedDate(po.expected_date || "");
        setReferenceNumber(po.reference_number);
        setStatus(po.status);
        setNotes(po.notes || "");
      }
      const its = await rest.all<any>("purchase_order_items", {
        filter: { purchase_order_id: editId! }, with: ["product"], perPage: 2000,
      });
      if (its && its.length) {
        setItems(its.map((i: any) => ({
          product_id: i.product_id,
          product_name: i.product?.name || "",
          sku: i.product?.sku,
          quantity: i.quantity,
          unit_cost: Number(i.unit_cost),
          total: Number(i.total),
        })));
      }
    })();
  }, [isEdit, editId]);

  const filteredProducts = useMemo(() => {
    if (!products || !productSearch) return [];
    const q = productSearch.toLowerCase();
    return (products as any[]).filter((p) =>
      p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [products, productSearch]);

  const addProduct = (p: any) => {
    const exists = items.find((i) => i.product_id === p.id);
    if (exists) {
      setItems(items.map((i) => i.product_id === p.id
        ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unit_cost }
        : i));
    } else {
      setItems([...items, {
        product_id: p.id, product_name: p.name, sku: p.sku,
        quantity: 1, unit_cost: Number(p.purchase_price || 0), total: Number(p.purchase_price || 0),
      }]);
    }
    setProductSearch(""); setShowSearch(false);
  };

  const updateItem = (idx: number, field: "quantity" | "unit_cost", value: number) => {
    setItems(items.map((it, i) => {
      if (i !== idx) return it;
      const u = { ...it, [field]: value };
      u.total = u.quantity * u.unit_cost;
      return u;
    }));
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const grandTotal = items.reduce((s, i) => s + i.total, 0);

  const handleSave = async () => {
    if (items.length === 0) { toast.error("Add at least one item"); return; }
    setSaving(true);
    try {
      let poId = editId;
      if (isEdit) {
        await rest.update("purchase_orders", editId!, {
          supplier_id: supplierId || null, order_date: orderDate,
          expected_date: expectedDate || null, reference_number: referenceNumber,
          status, notes: notes || null,
        });
        const existing = await rest.all<{ id: string }>("purchase_order_items", {
          filter: { purchase_order_id: editId! }, perPage: 2000,
        });
        await Promise.all(existing.map((r) => rest.remove("purchase_order_items", r.id)));
      } else {
        const data = await rest.create<any>("purchase_orders", {
          supplier_id: supplierId || null, order_date: orderDate,
          expected_date: expectedDate || null, reference_number: referenceNumber,
          status, notes: notes || null, created_by: user?.id,
        });
        poId = data.id;
      }
      const rows = items.map((i) => ({
        purchase_order_id: poId!, product_id: i.product_id,
        quantity: i.quantity, unit_cost: i.unit_cost, total: i.total,
      }));
      await Promise.all(rows.map((r) => rest.create("purchase_order_items", r)));
      await qc.invalidateQueries({ queryKey: ["purchase_orders"] });
      toast.success(isEdit ? "Purchase order updated" : "Purchase order created");
      navigate("/purchase-orders");
    } catch (e: any) {
      toast.error(e.message || "Failed to save purchase order");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={isEdit ? "Edit Purchase Order" : "Add Purchase Order"}
        description="Create a purchase order to send to a supplier"
        actions={
          <Button variant="outline" onClick={() => navigate("/purchase-orders")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Reference No</Label>
              <Input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} />
            </div>
            <div>
              <Label>Supplier</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {(suppliers ?? []).map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Order Date</Label>
              <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
            </div>
            <div>
              <Label>Expected Date</Label>
              <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
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

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products by name or SKU..."
              value={productSearch}
              onChange={(e) => { setProductSearch(e.target.value); setShowSearch(true); }}
              onFocus={() => setShowSearch(true)}
              className="pl-9"
            />
            {showSearch && filteredProducts.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-popover border rounded-md shadow-md max-h-72 overflow-auto">
                {filteredProducts.map((p: any) => (
                  <button key={p.id} type="button"
                    className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                    onClick={() => addProduct(p)}>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">SKU: {p.sku || "—"} · ৳{Number(p.purchase_price || 0).toLocaleString()}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="w-[120px]">Quantity</TableHead>
                <TableHead className="w-[140px]">Unit Cost</TableHead>
                <TableHead className="text-right w-[140px]">Total</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No items added</TableCell></TableRow>
              ) : items.map((it, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <div className="font-medium text-sm">{it.product_name}</div>
                    {it.sku && <div className="text-xs text-muted-foreground">SKU: {it.sku}</div>}
                  </TableCell>
                  <TableCell>
                    <Input type="number" min={1} value={it.quantity}
                      onChange={(e) => updateItem(idx, "quantity", Number(e.target.value) || 0)} />
                  </TableCell>
                  <TableCell>
                    <Input type="number" min={0} step="0.01" value={it.unit_cost}
                      onChange={(e) => updateItem(idx, "unit_cost", Number(e.target.value) || 0)} />
                  </TableCell>
                  <TableCell className="text-right font-medium">৳{it.total.toLocaleString()}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex justify-end">
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Grand Total</div>
              <div className="text-2xl font-bold">৳{grandTotal.toLocaleString()}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate("/purchase-orders")}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : isEdit ? "Update Order" : "Save Order"}
        </Button>
      </div>
    </div>
  );
}
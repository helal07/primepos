import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MediaCapture } from "@/components/exchange/MediaCapture";
import { rest } from "@/lib/restResource";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Save, X } from "lucide-react";
import { checkImeiUniqueness } from "@/hooks/useImeiValidation";

export default function ExchangePurchaseAdd() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tenantId, setTenantId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    purchase_date: new Date().toISOString().slice(0, 10),
    seller_name: "",
    seller_phone: "",
    seller_address: "",
    seller_nid_no: "",
    seller_nid_url: null as string | null,
    seller_photo_url: null as string | null,
    product_name: "",
    brand: "",
    model: "",
    imei: "",
    condition_notes: "",
    goods_photos: [] as string[],
    purchase_price: 0,
    payment_method: "cash",
    paid_amount: 0,
    notes: "",
  });

  useEffect(() => {
    if (!user) return;
    if (user.tenant_id) setTenantId(user.tenant_id);
  }, [user]);

  const update = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const addGoodsPhoto = (url: string | null) => {
    if (!url) return;
    setForm((f) => ({ ...f, goods_photos: [...f.goods_photos, url] }));
  };
  const removeGoodsPhoto = (i: number) =>
    setForm((f) => ({ ...f, goods_photos: f.goods_photos.filter((_, idx) => idx !== i) }));

  const handleSave = async () => {
    if (!form.seller_name.trim() || !form.product_name.trim() || form.purchase_price <= 0) {
      toast.error("Seller name, device and price are required");
      return;
    }
    if (form.imei.trim()) {
      const ok = await checkImeiUniqueness(form.imei.trim());
      if (!ok) return;
    }
    setSaving(true);
    try {
      // 1. Insert exchange purchase
      const ex = await rest.create<any>("exchange_purchases", {
        ...form,
        created_by: user?.id,
      });

      // 2. Auto-create a stock product so it can be sold
      const productPayload: any = {
        name: `${form.product_name}${form.imei ? ` (${form.imei})` : ""}`,
        sku: form.imei || `EX-${ex.reference_no}`,
        barcode: form.imei || null,
        purchase_price: form.purchase_price,
        selling_price: form.purchase_price, // user can edit later
        stock_quantity: 1,
        product_type: "general",
        serial_tracking: !!form.imei,
        is_active: true,
        description: form.condition_notes || null,
        created_by: user?.id,
      };
      try {
        const prod = await rest.create<any>("products", productPayload);
        await rest.update("exchange_purchases", ex.id, { linked_product_id: prod.id });
      } catch (pErr: any) {
        toast.warning("Saved buy, but couldn't create stock entry: " + (pErr?.message || "unknown error"));
      }

      toast.success("Exchange purchase saved");
      navigate(`/exchange/purchases/${ex.id}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <PageHeader
        title="New Exchange Buy"
        description="Buy a used device from a seller — capture KYC and device info"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => navigate("/exchange/purchases")}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !tenantId}>
              <Save className="h-4 w-4 mr-1" /> {saving ? "Saving…" : "Save"}
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader><CardTitle className="text-base">Seller Information (KYC)</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          <div><Label>Seller Name *</Label><Input value={form.seller_name} onChange={(e) => update("seller_name", e.target.value)} /></div>
          <div><Label>Phone</Label><Input value={form.seller_phone} onChange={(e) => update("seller_phone", e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Address</Label><Textarea rows={2} value={form.seller_address} onChange={(e) => update("seller_address", e.target.value)} /></div>
          <div><Label>NID Number</Label><Input value={form.seller_nid_no} onChange={(e) => update("seller_nid_no", e.target.value)} /></div>
          <div><Label>Purchase Date</Label><Input type="date" value={form.purchase_date} onChange={(e) => update("purchase_date", e.target.value)} /></div>

          {tenantId && (
            <>
              <MediaCapture
                label="NID Picture"
                value={form.seller_nid_url}
                onChange={(u) => update("seller_nid_url", u)}
                tenantId={tenantId}
                folder="nid"
              />
              <MediaCapture
                label="Seller Live Photo"
                value={form.seller_photo_url}
                onChange={(u) => update("seller_photo_url", u)}
                tenantId={tenantId}
                folder="selfie"
                enableCamera
              />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Device Information</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2"><Label>Product Name *</Label><Input placeholder="e.g. iPhone 13 Pro 128GB Blue" value={form.product_name} onChange={(e) => update("product_name", e.target.value)} /></div>
          <div><Label>Brand</Label><Input value={form.brand} onChange={(e) => update("brand", e.target.value)} /></div>
          <div><Label>Model</Label><Input value={form.model} onChange={(e) => update("model", e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>IMEI / Serial</Label><Input value={form.imei} onChange={(e) => update("imei", e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Condition / Notes</Label><Textarea rows={2} value={form.condition_notes} onChange={(e) => update("condition_notes", e.target.value)} /></div>

          {tenantId && (
            <div className="sm:col-span-2 space-y-2">
              <Label>Goods Photos</Label>
              <div className="flex gap-2 flex-wrap">
                {form.goods_photos.map((u, i) => (
                  <div key={i} className="relative">
                    <img src={u} className="h-20 w-20 object-cover rounded border" />
                    <button type="button" onClick={() => removeGoodsPhoto(i)}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              <MediaCapture
                label=""
                value={null}
                onChange={addGoodsPhoto}
                tenantId={tenantId}
                folder="goods"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Pricing & Payment</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-3">
          <div>
            <Label>Purchase Price *</Label>
            <Input type="number" value={form.purchase_price}
              onChange={(e) => { const v = +e.target.value; update("purchase_price", v); if (form.paid_amount === 0) update("paid_amount", v); }} />
          </div>
          <div>
            <Label>Payment Method</Label>
            <Select value={form.payment_method} onValueChange={(v) => update("payment_method", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank">Bank</SelectItem>
                <SelectItem value="mobile">Mobile Banking</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Paid Amount</Label>
            <Input type="number" value={form.paid_amount} onChange={(e) => update("paid_amount", +e.target.value)} />
          </div>
          <div className="sm:col-span-3">
            <Label>Internal Notes</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => update("notes", e.target.value)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
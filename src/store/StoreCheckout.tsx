import { useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { StoreCtx } from "./StoreLayout";

export default function StoreCheckout() {
  const { tenant, settings } = useOutletContext<StoreCtx>();
  const { items, subtotal, clear } = useCart();
  const nav = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    shipping_address: "",
    city: "",
    notes: "",
    payment_method: "cod",
  });

  const flat = Number(settings.shipping_flat_rate ?? 0);
  const free = settings.free_shipping_threshold;
  const shipping = free != null && subtotal >= Number(free) ? 0 : flat;
  const total = subtotal + shipping;

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const placeOrder = async () => {
    if (items.length === 0) return;
    if (!form.customer_name || !form.customer_phone || !form.shipping_address) {
      toast.error("Name, phone and address are required");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("place_store_order", {
        p_tenant_slug: tenant.slug,
        p_customer_name: form.customer_name,
        p_customer_phone: form.customer_phone,
        p_customer_email: form.customer_email || null,
        p_shipping_address: form.shipping_address,
        p_city: form.city || null,
        p_notes: form.notes || null,
        p_payment_method: form.payment_method,
        p_items: items.map((i) => ({
          product_id: i.productId,
          variation_id: i.variationId ?? null,
          quantity: i.qty,
        })),
      } as any);
      if (error) throw error;
      const orderId = (data as any)?.order_id;
      clear();
      nav(`/store/${tenant.slug}/order/${orderId}`);
    } catch (e: any) {
      toast.error(e.message || "Could not place order");
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Your cart is empty</h1>
        <Button asChild className="mt-4"><Link to={`/store/${tenant.slug}/shop`}>Browse products</Link></Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-4">
        <Card>
          <CardHeader><CardTitle>Contact & shipping</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><Label>Full name *</Label><Input value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} /></div>
            <div><Label>Phone *</Label><Input value={form.customer_phone} onChange={(e) => set("customer_phone", e.target.value)} /></div>
            <div><Label>Email</Label><Input type="email" value={form.customer_email} onChange={(e) => set("customer_email", e.target.value)} /></div>
            <div className="md:col-span-2"><Label>Shipping address *</Label><Textarea value={form.shipping_address} onChange={(e) => set("shipping_address", e.target.value)} /></div>
            <div><Label>City</Label><Input value={form.city} onChange={(e) => set("city", e.target.value)} /></div>
            <div className="md:col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Payment</CardTitle></CardHeader>
          <CardContent>
            <RadioGroup value={form.payment_method} onValueChange={(v) => set("payment_method", v)}>
              {settings.enable_cod !== false && (
                <label className="flex items-center gap-3 border rounded p-3 cursor-pointer">
                  <RadioGroupItem value="cod" />
                  <div><p className="font-medium">Cash on delivery</p><p className="text-sm text-muted-foreground">Pay when you receive your order.</p></div>
                </label>
              )}
              {settings.enable_sslcommerz && (
                <label className="flex items-center gap-3 border rounded p-3 cursor-pointer opacity-60">
                  <RadioGroupItem value="sslcommerz" disabled />
                  <div><p className="font-medium">SSLCommerz <span className="text-xs">(coming soon)</span></p></div>
                </label>
              )}
              {settings.enable_bkash && (
                <label className="flex items-center gap-3 border rounded p-3 cursor-pointer opacity-60">
                  <RadioGroupItem value="bkash" disabled />
                  <div><p className="font-medium">bKash <span className="text-xs">(coming soon)</span></p></div>
                </label>
              )}
            </RadioGroup>
          </CardContent>
        </Card>
      </div>

      <div>
        <Card className="sticky top-4">
          <CardHeader><CardTitle>Order summary</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {items.map((i) => (
              <div key={`${i.productId}:${i.variationId ?? ""}`} className="flex justify-between gap-2">
                <span className="truncate">{i.name} × {i.qty}</span>
                <span>{settings.currency} {(i.price * i.qty).toLocaleString()}</span>
              </div>
            ))}
            <div className="border-t pt-2 flex justify-between"><span>Subtotal</span><span>{settings.currency} {subtotal.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>Shipping</span><span>{shipping === 0 ? "Free" : `${settings.currency} ${shipping.toLocaleString()}`}</span></div>
            <div className="border-t pt-2 flex justify-between font-bold text-base"><span>Total</span><span>{settings.currency} {total.toLocaleString()}</span></div>
            <Button className="w-full mt-4" size="lg" onClick={placeOrder} disabled={submitting}>{submitting ? "Placing order..." : "Place order"}</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

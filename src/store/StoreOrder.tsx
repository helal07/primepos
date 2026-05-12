import { Link, useOutletContext, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import type { StoreCtx } from "./StoreLayout";

export default function StoreOrder() {
  const { tenant, settings, base } = useOutletContext<StoreCtx>();
  const { orderId } = useParams();
  const [params] = useSearchParams();
  const paymentResult = params.get("payment");

  const { data: order, isLoading } = useQuery({
    queryKey: ["store_order", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data } = await supabase.from("store_orders").select("*").eq("id", orderId!).maybeSingle();
      return data;
    },
  });

  const { data: items } = useQuery({
    queryKey: ["store_order_items", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data } = await supabase.from("store_order_items").select("*").eq("order_id", orderId!);
      return data ?? [];
    },
  });

  if (isLoading) return <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">Loading…</div>;
  if (!order) return <div className="container mx-auto px-4 py-16 text-center"><h1 className="text-xl">Order not found</h1></div>;

  const statusColor: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    confirmed: "bg-blue-100 text-blue-800",
    fulfilled: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl space-y-4">
      <div className="text-center py-6">
        <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-2" />
        <h1 className="text-2xl font-bold">Thank you for your order!</h1>
        <p className="text-muted-foreground">Order #{order.order_number}</p>
        <div className="mt-2 flex justify-center gap-2">
          <Badge className={statusColor[order.status] ?? ""}>{order.status}</Badge>
          <Badge variant="outline">payment: {order.payment_status}</Badge>
        </div>
        {paymentResult && paymentResult !== "success" && (
          <p className="mt-3 text-sm text-destructive">
            Payment {paymentResult}. You can retry from your store or contact support.
          </p>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle>Items</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(items ?? []).map((i: any) => (
            <div key={i.id} className="flex justify-between">
              <span>{i.product_name}{i.variation_name ? ` — ${i.variation_name}` : ""} × {i.quantity}</span>
              <span>{settings.currency} {Number(i.total).toLocaleString()}</span>
            </div>
          ))}
          <div className="border-t pt-2 flex justify-between"><span>Subtotal</span><span>{settings.currency} {Number(order.subtotal).toLocaleString()}</span></div>
          <div className="flex justify-between"><span>Shipping</span><span>{settings.currency} {Number(order.shipping_cost).toLocaleString()}</span></div>
          <div className="border-t pt-2 flex justify-between font-bold text-base"><span>Total</span><span>{settings.currency} {Number(order.total_amount).toLocaleString()}</span></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Delivery</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          <p><span className="text-muted-foreground">Name:</span> {order.customer_name}</p>
          <p><span className="text-muted-foreground">Phone:</span> {order.customer_phone}</p>
          {order.customer_email && <p><span className="text-muted-foreground">Email:</span> {order.customer_email}</p>}
          <p><span className="text-muted-foreground">Address:</span> {order.shipping_address}{order.city ? `, ${order.city}` : ""}</p>
          <p><span className="text-muted-foreground">Payment:</span> {order.payment_method.toUpperCase()} ({order.payment_status})</p>
        </CardContent>
      </Card>

      <div className="flex justify-center gap-2">
        <Button asChild variant="outline"><Link to={`${base}`}>Back to store</Link></Button>
      </div>
    </div>
  );
}

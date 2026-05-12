import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, Eye, Truck } from "lucide-react";
import { toast } from "sonner";

const statusColor: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  fulfilled: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function StoreOrdersAdmin() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [status, setStatus] = useState<string>("all");
  const [viewing, setViewing] = useState<any>(null);

  const { data: orders } = useQuery({
    queryKey: ["store_orders_admin", status],
    queryFn: async () => {
      let q = supabase.from("store_orders").select("*").order("created_at", { ascending: false });
      if (status !== "all") q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: items } = useQuery({
    queryKey: ["store_order_items_admin", viewing?.id],
    enabled: !!viewing?.id,
    queryFn: async () => {
      const { data } = await supabase.from("store_order_items").select("*").eq("order_id", viewing.id);
      return data ?? [];
    },
  });

  const confirm = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc("confirm_store_order", { p_order_id: id });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Order confirmed and added to sales");
      qc.invalidateQueries({ queryKey: ["store_orders_admin"] });
      setViewing(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const reason = window.prompt("Cancellation reason?") ?? "";
      const { error } = await supabase.rpc("cancel_store_order", { p_order_id: id, p_reason: reason });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Order cancelled");
      qc.invalidateQueries({ queryKey: ["store_orders_admin"] });
      setViewing(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Website Orders" description="Orders from your storefront" />

      <Tabs value={status} onValueChange={setStatus}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(orders ?? []).map((o: any) => (
              <TableRow key={o.id}>
                <TableCell className="font-medium">{o.order_number}</TableCell>
                <TableCell>{new Date(o.created_at).toLocaleString()}</TableCell>
                <TableCell><div>{o.customer_name}</div><div className="text-xs text-muted-foreground">{o.customer_phone}</div></TableCell>
                <TableCell>{Number(o.total_amount).toLocaleString()}</TableCell>
                <TableCell className="uppercase text-xs">{o.payment_method}</TableCell>
                <TableCell><Badge className={statusColor[o.status] ?? ""}>{o.status}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setViewing(o)}><Eye className="h-4 w-4" /></Button>
                    {o.shipment_id && (
                      <Button size="icon" variant="ghost" onClick={() => nav(`/shipments`)} title="Shipments"><Truck className="h-4 w-4" /></Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(!orders || orders.length === 0) && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No orders yet</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Order {viewing?.order_number}</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><div className="text-muted-foreground">Customer</div><div>{viewing.customer_name}</div><div>{viewing.customer_phone}</div>{viewing.customer_email && <div>{viewing.customer_email}</div>}</div>
                <div><div className="text-muted-foreground">Shipping</div><div>{viewing.shipping_address}{viewing.city ? `, ${viewing.city}` : ""}</div></div>
              </div>
              <div className="border rounded">
                <table className="w-full text-sm">
                  <thead><tr className="border-b"><th className="text-left p-2">Item</th><th className="text-right p-2">Qty</th><th className="text-right p-2">Price</th><th className="text-right p-2">Total</th></tr></thead>
                  <tbody>
                    {(items ?? []).map((i: any) => (
                      <tr key={i.id} className="border-b last:border-0">
                        <td className="p-2">{i.product_name}{i.variation_name ? ` — ${i.variation_name}` : ""}</td>
                        <td className="p-2 text-right">{i.quantity}</td>
                        <td className="p-2 text-right">{Number(i.unit_price).toLocaleString()}</td>
                        <td className="p-2 text-right">{Number(i.total).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between"><span>Subtotal</span><span>{Number(viewing.subtotal).toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>{Number(viewing.shipping_cost).toLocaleString()}</span></div>
              <div className="flex justify-between font-bold"><span>Total</span><span>{Number(viewing.total_amount).toLocaleString()}</span></div>
              {viewing.notes && <div className="border-t pt-2"><div className="text-muted-foreground">Notes</div><div>{viewing.notes}</div></div>}

              <div className="flex justify-end gap-2 pt-2 border-t">
                {viewing.status === "pending" && (
                  <>
                    <Button variant="outline" onClick={() => cancel.mutate(viewing.id)} disabled={cancel.isPending}><XCircle className="h-4 w-4 mr-1" />Cancel</Button>
                    <Button onClick={() => confirm.mutate(viewing.id)} disabled={confirm.isPending}><CheckCircle2 className="h-4 w-4 mr-1" />Confirm & create sale</Button>
                  </>
                )}
                {viewing.sale_id && (
                  <Button variant="outline" onClick={() => nav(`/sales/${viewing.sale_id}`)}>View sale</Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

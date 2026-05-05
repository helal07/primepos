import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, ShoppingCart, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

export default function ExchangePurchaseView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: r, isLoading } = useQuery({
    queryKey: ["exchange_purchase", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("exchange_purchases").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="py-10 text-center text-muted-foreground">Loading…</div>;
  if (!r) return <div className="py-10 text-center text-muted-foreground">Not found</div>;

  const Field = ({ label, value }: { label: string; value: any }) => (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || "—"}</p>
    </div>
  );

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <PageHeader
        title={`Exchange Buy ${r.reference_no}`}
        description={`${r.product_name} • ${format(new Date(r.purchase_date), "yyyy-MM-dd")}`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => navigate("/exchange/purchases")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/exchange/agreement/${r.id}`)}>
              <Printer className="h-4 w-4 mr-1" /> Print Agreement
            </Button>
            {r.status === "in_stock" && (
              <Button size="sm" onClick={() => navigate(`/exchange/sell?product=${r.linked_product_id}&exchange=${r.id}`)}>
                <ShoppingCart className="h-4 w-4 mr-1" /> Sell
              </Button>
            )}
          </>
        }
      />

      <div className="flex gap-2">
        <Badge variant={r.status === "sold" ? "default" : "secondary"}>{r.status.replace("_", " ")}</Badge>
        <Badge variant="outline">{r.payment_method}</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Seller</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          <Field label="Name" value={r.seller_name} />
          <Field label="Phone" value={r.seller_phone} />
          <Field label="Address" value={r.seller_address} />
          <Field label="NID Number" value={r.seller_nid_no} />
          {r.seller_nid_url && (
            <div><p className="text-xs text-muted-foreground mb-1">NID</p><img src={r.seller_nid_url} className="h-32 rounded border" /></div>
          )}
          {r.seller_photo_url && (
            <div><p className="text-xs text-muted-foreground mb-1">Live Photo</p><img src={r.seller_photo_url} className="h-32 rounded border" /></div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Device</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          <Field label="Product" value={r.product_name} />
          <Field label="Brand / Model" value={[r.brand, r.model].filter(Boolean).join(" ")} />
          <Field label="IMEI" value={r.imei} />
          <Field label="Condition" value={r.condition_notes} />
          {r.goods_photos?.length > 0 && (
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground mb-1">Goods Photos</p>
              <div className="flex gap-2 flex-wrap">
                {r.goods_photos.map((u: string, i: number) => (
                  <img key={i} src={u} className="h-24 w-24 object-cover rounded border" />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Pricing</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-3">
          <Field label="Purchase Price" value={`৳${Number(r.purchase_price).toLocaleString()}`} />
          <Field label="Paid" value={`৳${Number(r.paid_amount).toLocaleString()}`} />
          <Field label="Payment Method" value={r.payment_method} />
        </CardContent>
      </Card>
    </div>
  );
}
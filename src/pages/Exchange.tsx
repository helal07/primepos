import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeftRight, Plus, ListOrdered, ShoppingCart, TrendingUp, FileSignature } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { rest } from "@/lib/restResource";
import { AgreementTemplateDialog } from "@/components/exchange/AgreementTemplateDialog";

export default function Exchange() {
  const navigate = useNavigate();
  const [agreementOpen, setAgreementOpen] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ["exchange_stats"],
    queryFn: async () => {
      const all = await rest.all<{ status: string; purchase_price: number | string }>(
        "exchange_purchases", { perPage: 5000 }
      );
      const inStock = all.filter((r: any) => r.status === "in_stock");
      const sold = all.filter((r: any) => r.status === "sold");
      const investedInStock = inStock.reduce((s: number, r: any) => s + Number(r.purchase_price || 0), 0);
      return {
        total: all.length,
        inStock: inStock.length,
        sold: sold.length,
        invested: investedInStock,
      };
    },
  });

  const tiles = [
    { label: "Total Buys", value: stats?.total ?? 0, icon: ArrowLeftRight, color: "text-blue-600" },
    { label: "In Stock", value: stats?.inStock ?? 0, icon: ListOrdered, color: "text-amber-600" },
    { label: "Sold", value: stats?.sold ?? 0, icon: ShoppingCart, color: "text-emerald-600" },
    { label: "Invested (In Stock)", value: `৳${(stats?.invested ?? 0).toLocaleString()}`, icon: TrendingUp, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exchange"
        description="Used phone buy & sell with seller KYC and printable agreements"
        actions={
          <>
            <Button onClick={() => navigate("/exchange/purchases/add")} size="sm">
              <Plus className="h-4 w-4 mr-1" /> New Buy
            </Button>
            <Button onClick={() => navigate("/exchange/sell")} size="sm" variant="outline">
              <ShoppingCart className="h-4 w-4 mr-1" /> Sell
            </Button>
            <Button onClick={() => setAgreementOpen(true)} size="sm" variant="outline">
              <FileSignature className="h-4 w-4 mr-1" /> Customize Agreement
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{t.label}</p>
                  <p className="text-2xl font-semibold mt-1">{t.value}</p>
                </div>
                <t.icon className={`h-6 w-6 ${t.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-3">
          <Button variant="outline" onClick={() => navigate("/exchange/purchases/add")}>
            <Plus className="h-4 w-4 mr-2" /> Buy used phone
          </Button>
          <Button variant="outline" onClick={() => navigate("/exchange/purchases")}>
            <ListOrdered className="h-4 w-4 mr-2" /> View all buys
          </Button>
          <Button variant="outline" onClick={() => navigate("/exchange/sell")}>
            <ShoppingCart className="h-4 w-4 mr-2" /> Sell from stock
          </Button>
          <Button variant="outline" onClick={() => setAgreementOpen(true)}>
            <FileSignature className="h-4 w-4 mr-2" /> Customize agreement
          </Button>
        </CardContent>
      </Card>

      <AgreementTemplateDialog open={agreementOpen} onOpenChange={setAgreementOpen} />
    </div>
  );
}
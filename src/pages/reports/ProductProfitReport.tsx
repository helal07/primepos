import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ProductProfitReport() {
  const [from, setFrom] = useState(() => new Date(new Date().setDate(1)).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const { data, isLoading } = useQuery({
    queryKey: ["report_product_profit", from, to],
    queryFn: async () => {
      const { data: saleItems } = await supabase.from("sale_items").select("product_id, quantity, unit_price, total, products(name, purchase_price, category_id, brand_id, categories(name), brands(name))").gte("created_at", from).lte("created_at", to + "T23:59:59");
      
      const productMap: Record<string, { name: string; category: string; brand: string; revenue: number; cost: number; qty: number }> = {};
      const categoryMap: Record<string, { name: string; revenue: number; cost: number }> = {};
      const brandMap: Record<string, { name: string; revenue: number; cost: number }> = {};

      (saleItems ?? []).forEach((item: any) => {
        const pid = item.product_id;
        const pName = item.products?.name || "Unknown";
        const pCost = Number(item.products?.purchase_price || 0);
        const catName = item.products?.categories?.name || "Uncategorized";
        const bName = item.products?.brands?.name || "No Brand";
        const revenue = Number(item.total);
        const cost = pCost * Number(item.quantity);

        if (!productMap[pid]) productMap[pid] = { name: pName, category: catName, brand: bName, revenue: 0, cost: 0, qty: 0 };
        productMap[pid].revenue += revenue;
        productMap[pid].cost += cost;
        productMap[pid].qty += Number(item.quantity);

        if (!categoryMap[catName]) categoryMap[catName] = { name: catName, revenue: 0, cost: 0 };
        categoryMap[catName].revenue += revenue;
        categoryMap[catName].cost += cost;

        if (!brandMap[bName]) brandMap[bName] = { name: bName, revenue: 0, cost: 0 };
        brandMap[bName].revenue += revenue;
        brandMap[bName].cost += cost;
      });

      const products = Object.values(productMap).map(p => ({ ...p, profit: p.revenue - p.cost })).sort((a, b) => b.profit - a.profit);
      const categories = Object.values(categoryMap).map(c => ({ ...c, profit: c.revenue - c.cost })).sort((a, b) => b.profit - a.profit);
      const brands = Object.values(brandMap).map(b => ({ ...b, profit: b.revenue - b.cost })).sort((a, b) => b.profit - a.profit);
      const totalProfit = products.reduce((s, p) => s + p.profit, 0);

      return { products, categories, brands, totalProfit };
    },
  });

  const fmt = (n: number) => n.toLocaleString("en", { minimumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      <PageHeader title="Product Profit Report" subtitle="Profit breakdown by product, category, and brand" />
      <div className="flex flex-wrap gap-3 items-end">
        <div><Label>From</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-44" /></div>
        <div><Label>To</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-44" /></div>
      </div>

      {isLoading ? <Skeleton className="h-60 w-full" /> : data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Gross Profit</p><p className="text-2xl font-bold text-emerald-600">৳ {fmt(data.totalProfit)}</p></CardContent></Card>
            <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Products Sold</p><p className="text-2xl font-bold">{data.products.length}</p></CardContent></Card>
            <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Categories</p><p className="text-2xl font-bold">{data.categories.length}</p></CardContent></Card>
          </div>

          <Tabs defaultValue="products">
            <TabsList><TabsTrigger value="products">By Products</TabsTrigger><TabsTrigger value="categories">By Categories</TabsTrigger><TabsTrigger value="brands">By Brands</TabsTrigger></TabsList>
            <TabsContent value="products">
              <Card><CardContent className="pt-4">
                <Table><TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Cost</TableHead><TableHead className="text-right">Gross Profit</TableHead></TableRow></TableHeader>
                <TableBody>{data.products.map((p, i) => (
                  <TableRow key={i}><TableCell>{p.name}</TableCell><TableCell className="text-right">{p.qty}</TableCell><TableCell className="text-right">৳ {fmt(p.revenue)}</TableCell><TableCell className="text-right">৳ {fmt(p.cost)}</TableCell><TableCell className={`text-right font-medium ${p.profit >= 0 ? "text-emerald-600" : "text-destructive"}`}>৳ {fmt(p.profit)}</TableCell></TableRow>
                ))}<TableRow className="font-bold bg-muted/50"><TableCell colSpan={4}>Total</TableCell><TableCell className="text-right">৳ {fmt(data.totalProfit)}</TableCell></TableRow></TableBody></Table>
              </CardContent></Card>
            </TabsContent>
            <TabsContent value="categories">
              <Card><CardContent className="pt-4">
                <Table><TableHeader><TableRow><TableHead>Category</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Cost</TableHead><TableHead className="text-right">Gross Profit</TableHead></TableRow></TableHeader>
                <TableBody>{data.categories.map((c, i) => (
                  <TableRow key={i}><TableCell>{c.name}</TableCell><TableCell className="text-right">৳ {fmt(c.revenue)}</TableCell><TableCell className="text-right">৳ {fmt(c.cost)}</TableCell><TableCell className={`text-right font-medium ${c.profit >= 0 ? "text-emerald-600" : "text-destructive"}`}>৳ {fmt(c.profit)}</TableCell></TableRow>
                ))}</TableBody></Table>
              </CardContent></Card>
            </TabsContent>
            <TabsContent value="brands">
              <Card><CardContent className="pt-4">
                <Table><TableHeader><TableRow><TableHead>Brand</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Cost</TableHead><TableHead className="text-right">Gross Profit</TableHead></TableRow></TableHeader>
                <TableBody>{data.brands.map((b, i) => (
                  <TableRow key={i}><TableCell>{b.name}</TableCell><TableCell className="text-right">৳ {fmt(b.revenue)}</TableCell><TableCell className="text-right">৳ {fmt(b.cost)}</TableCell><TableCell className={`text-right font-medium ${b.profit >= 0 ? "text-emerald-600" : "text-destructive"}`}>৳ {fmt(b.profit)}</TableCell></TableRow>
                ))}</TableBody></Table>
              </CardContent></Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

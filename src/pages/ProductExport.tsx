import { useMemo, useState } from "react";
import Papa from "papaparse";
import { useProducts } from "@/hooks/useInventory";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileSpreadsheet, Search } from "lucide-react";
import { toast } from "sonner";

const COLUMNS = [
  { key: "name", label: "Name" },
  { key: "sku", label: "SKU" },
  { key: "barcode", label: "Barcode" },
  { key: "category", label: "Category" },
  { key: "brand", label: "Brand" },
  { key: "unit", label: "Unit" },
  { key: "purchase_price", label: "Purchase Price" },
  { key: "selling_price", label: "Selling Price" },
  { key: "tax_percent", label: "Tax %" },
  { key: "stock_quantity", label: "Stock" },
  { key: "alert_quantity", label: "Alert Qty" },
  { key: "product_type", label: "Type" },
  { key: "description", label: "Description" },
];

export default function ProductExport() {
  const { data: products, isLoading } = useProducts();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>(COLUMNS.map((c) => c.key));

  const rows = useMemo(() => {
    return (products || [])
      .filter((p: any) => !search || p.name.toLowerCase().includes(search.toLowerCase()))
      .map((p: any) => ({
        name: p.name,
        sku: p.sku || "",
        barcode: p.barcode || "",
        category: p.categories?.name || "",
        brand: p.brands?.name || "",
        unit: p.units?.name || "",
        purchase_price: p.purchase_price ?? 0,
        selling_price: p.selling_price ?? 0,
        tax_percent: p.tax_percent ?? 0,
        stock_quantity: p.stock_quantity ?? 0,
        alert_quantity: p.alert_quantity ?? 0,
        product_type: p.product_type || "general",
        description: p.description || "",
      }));
  }, [products, search]);

  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    if (!rows.length) return toast.error("No products to export");
    const filtered = rows.map((r) => Object.fromEntries(selected.map((k) => [k, (r as any)[k]])));
    const csv = Papa.unparse(filtered);
    downloadFile(csv, `products-${Date.now()}.csv`, "text/csv;charset=utf-8");
    toast.success(`Exported ${rows.length} products`);
  };

  const exportJson = () => {
    if (!rows.length) return toast.error("No products to export");
    const filtered = rows.map((r) => Object.fromEntries(selected.map((k) => [k, (r as any)[k]])));
    downloadFile(JSON.stringify(filtered, null, 2), `products-${Date.now()}.json`, "application/json");
    toast.success(`Exported ${rows.length} products`);
  };

  const toggle = (key: string) =>
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  return (
    <div className="space-y-6">
      <PageHeader title="Export Products" description="Download your product catalog as CSV or JSON" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" /> Export Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Filter</Label>
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search by name..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Columns ({selected.length}/{COLUMNS.length})</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {COLUMNS.map((c) => (
                <label key={c.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={selected.includes(c.key)} onCheckedChange={() => toggle(c.key)} />
                  {c.label}
                </label>
              ))}
            </div>
          </div>

          {isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{rows.length}</span> products will be exported with{" "}
                <span className="font-semibold text-foreground">{selected.length}</span> columns.
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={exportCsv} disabled={!rows.length || !selected.length}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
            <Button variant="outline" onClick={exportJson} disabled={!rows.length || !selected.length}>
              <Download className="h-4 w-4 mr-2" /> Export JSON
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

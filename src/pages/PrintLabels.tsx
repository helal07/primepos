import { useEffect, useMemo, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { useProducts } from "@/hooks/useInventory";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Printer, Plus, Search } from "lucide-react";
import { toast } from "sonner";

type Item = { id: string; name: string; price: number; barcode: string; sku: string; qty: number };

const SIZES: Record<string, { w: string; h: string; cols: number; label: string }> = {
  small: { w: "38mm", h: "25mm", cols: 4, label: "Small (38×25mm)" },
  medium: { w: "50mm", h: "30mm", cols: 3, label: "Medium (50×30mm)" },
  large: { w: "70mm", h: "40mm", cols: 2, label: "Large (70×40mm)" },
};

function Barcode({ value }: { value: string }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (ref.current && value) {
      try {
        JsBarcode(ref.current, value, {
          format: "CODE128",
          width: 0.9,
          height: 28,
          displayValue: false,
          margin: 0,
        });
      } catch {}
    }
  }, [value]);
  return <svg ref={ref} className="w-full" />;
}

export default function PrintLabels() {
  const { data: products, isLoading } = useProducts();
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [size, setSize] = useState<keyof typeof SIZES>("medium");
  const [showName, setShowName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showBarcode, setShowBarcode] = useState(true);
  const [storeName, setStoreName] = useState("");

  const filtered = useMemo(
    () => (products || []).filter((p: any) => p.name.toLowerCase().includes(search.toLowerCase())).slice(0, 20),
    [products, search]
  );

  const add = (p: any) => {
    if (items.find((i) => i.id === p.id)) {
      setItems((prev) => prev.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i)));
    } else {
      setItems((prev) => [
        ...prev,
        {
          id: p.id,
          name: p.name,
          price: Number(p.selling_price) || 0,
          barcode: p.barcode || p.sku || p.id.slice(0, 12),
          sku: p.sku || "",
          qty: 1,
        },
      ]);
    }
  };

  const setQty = (id: string, qty: number) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty: Math.max(1, qty) } : i)));
  const remove = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const totalLabels = items.reduce((s, i) => s + i.qty, 0);

  const print = () => {
    if (!totalLabels) return toast.error("Add at least one product");
    window.print();
  };

  const conf = SIZES[size];
  const labelArray = items.flatMap((i) => Array.from({ length: i.qty }, () => i));

  return (
    <div className="space-y-6">
      <PageHeader title="Print Labels" description="Generate and print barcode labels for your products" />

      <div className="grid lg:grid-cols-2 gap-6 print:hidden">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add Products</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="border rounded-lg max-h-80 overflow-auto divide-y">
              {isLoading ? (
                <Skeleton className="h-40 m-2" />
              ) : filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 text-center">No products found</p>
              ) : (
                filtered.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-2 hover:bg-muted/50">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.sku || "—"} · ৳{Number(p.selling_price || 0).toLocaleString()}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => add(p)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Selected ({items.length})</span>
              <Badge variant="secondary">{totalLabels} labels</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Label Size</Label>
                <Select value={size} onValueChange={(v) => setSize(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SIZES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Store Name (optional)</Label>
                <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="e.g. Prime POS" />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={showName} onCheckedChange={(v) => setShowName(!!v)} /> Name
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={showPrice} onCheckedChange={(v) => setShowPrice(!!v)} /> Price
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={showBarcode} onCheckedChange={(v) => setShowBarcode(!!v)} /> Barcode
              </label>
            </div>

            <div className="border rounded-lg max-h-64 overflow-auto divide-y">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 text-center">No products selected</p>
              ) : (
                items.map((i) => (
                  <div key={i.id} className="flex items-center gap-2 p-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{i.name}</p>
                      <p className="text-xs text-muted-foreground">{i.barcode}</p>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      value={i.qty}
                      onChange={(e) => setQty(i.id, Number(e.target.value))}
                      className="w-20 h-8"
                    />
                    <Button size="icon" variant="ghost" onClick={() => remove(i.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            <Button onClick={print} disabled={!totalLabels} className="w-full">
              <Printer className="h-4 w-4 mr-2" /> Print {totalLabels} Labels
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Print preview / print area */}
      <div className="print-area">
        <Card className="print:shadow-none print:border-0">
          <CardHeader className="print:hidden">
            <CardTitle className="text-base">Preview</CardTitle>
          </CardHeader>
          <CardContent className="print:p-0">
            {labelArray.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8 print:hidden">Add products to preview labels</p>
            ) : (
              <div className="label-grid">
                {labelArray.map((i, idx) => (
                  <div key={idx} className="label-cell" style={{ width: conf.w, height: conf.h }}>
                    {storeName && <div className="label-store">{storeName}</div>}
                    {showName && <div className="label-name">{i.name}</div>}
                    {showBarcode && <div className="label-barcode"><Barcode value={i.barcode} /></div>}
                    {showBarcode && <div className="label-code">{i.barcode}</div>}
                    {showPrice && <div className="label-price">৳{i.price.toLocaleString()}</div>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <style>{`
        .label-grid {
          display: grid;
          grid-template-columns: repeat(${conf.cols}, ${conf.w});
          gap: 2mm;
          justify-content: start;
        }
        .label-cell {
          border: 1px dashed #ccc;
          padding: 1.5mm;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          overflow: hidden;
          page-break-inside: avoid;
        }
        .label-store { font-size: 8px; font-weight: 600; }
        .label-name { font-size: 9px; font-weight: 600; line-height: 1.1; max-height: 22px; overflow: hidden; }
        .label-barcode { width: 80%; height: 28px; display: flex; justify-content: center; }
        .label-code { font-size: 7px; letter-spacing: 0.5px; }
        .label-price { font-size: 11px; font-weight: 700; }
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; top: 0; left: 0; width: 100%; }
          .label-cell { border: none; }
          @page { margin: 5mm; }
        }
      `}</style>
    </div>
  );
}

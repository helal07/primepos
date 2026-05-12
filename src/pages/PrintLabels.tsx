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

type FormatKey = "auto" | "CODE128" | "EAN13" | "UPC" | "EAN8" | "CODE39";

const FORMATS: { value: FormatKey; label: string }[] = [
  { value: "auto", label: "Auto (shortest that fits)" },
  { value: "EAN13", label: "EAN-13 (13 digits)" },
  { value: "UPC", label: "UPC-A (12 digits)" },
  { value: "EAN8", label: "EAN-8 (8 digits)" },
  { value: "CODE39", label: "CODE39" },
  { value: "CODE128", label: "CODE128 (any text)" },
];

// Pick the most compact symbology a value can encode.
function pickFormat(value: string, preferred: FormatKey): { format: string; value: string } {
  const digits = value.replace(/\D/g, "");
  const isDigits = /^\d+$/.test(value);
  if (preferred !== "auto") {
    if (preferred === "EAN13" && isDigits && (value.length === 12 || value.length === 13)) return { format: "EAN13", value };
    if (preferred === "UPC" && isDigits && (value.length === 11 || value.length === 12)) return { format: "UPC", value };
    if (preferred === "EAN8" && isDigits && (value.length === 7 || value.length === 8)) return { format: "EAN8", value };
    if (preferred === "CODE39") return { format: "CODE39", value: value.toUpperCase() };
    if (preferred === "CODE128") return { format: "CODE128", value };
    // fall through to auto if invalid
  }
  // Auto: prefer the most compact valid format
  if (isDigits) {
    if (digits.length === 8 || digits.length === 7) return { format: "EAN8", value };
    if (digits.length === 11 || digits.length === 12) return { format: "UPC", value };
    if (digits.length === 12 || digits.length === 13) return { format: "EAN13", value };
  }
  return { format: "CODE128", value };
}

const SIZES: Record<string, { w: string; h: string; cols: number; label: string }> = {
  small: { w: "38mm", h: "25mm", cols: 4, label: "Small (38×25mm)" },
  medium: { w: "50mm", h: "30mm", cols: 3, label: "Medium (50×30mm)" },
  large: { w: "70mm", h: "40mm", cols: 2, label: "Large (70×40mm)" },
};

function Barcode({
  value, preferred, barWidth, barHeight, margin, autoFit,
}: {
  value: string; preferred: FormatKey; barWidth: number; barHeight: number; margin: number; autoFit: boolean;
}) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (ref.current && value) {
      const { format, value: encoded } = pickFormat(value, preferred);
      try {
        JsBarcode(ref.current, encoded, {
          format,
          width: barWidth,
          height: barHeight,
          displayValue: false,
          margin,
        });
      } catch {
        // Fallback to CODE128 if the chosen format rejects the value
        try {
          JsBarcode(ref.current, value, {
            format: "CODE128",
            width: barWidth,
            height: barHeight,
            displayValue: false,
            margin,
          });
        } catch {}
      }
      // Auto-fit: stretch SVG to its container so it never exceeds label width
      if (autoFit && ref.current) {
        ref.current.setAttribute("width", "100%");
        ref.current.setAttribute("preserveAspectRatio", "none");
      } else if (ref.current) {
        ref.current.removeAttribute("preserveAspectRatio");
      }
    }
  }, [value, preferred, barWidth, barHeight, margin, autoFit]);
  return <svg ref={ref} className={autoFit ? "w-full h-full block" : "max-w-full block"} />;
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
  const [barcodeFormat, setBarcodeFormat] = useState<FormatKey>("auto");
  const [barWidth, setBarWidth] = useState(0.9);
  const [barHeight, setBarHeight] = useState(28);
  const [barMargin, setBarMargin] = useState(0);
  const [cellPadding, setCellPadding] = useState(1.5); // mm
  const [autoFitBarcode, setAutoFitBarcode] = useState(true);

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

            <div className="space-y-2">
              <Label>Barcode Format</Label>
              <Select value={barcodeFormat} onValueChange={(v) => setBarcodeFormat(v as FormatKey)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FORMATS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                EAN/UPC are much narrower than CODE128 but require numeric codes of an exact length. Auto picks the shortest valid format per item.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Bar Width</Label>
                <Input
                  type="number" step={0.1} min={0.5} max={4}
                  value={barWidth}
                  onChange={(e) => setBarWidth(Math.max(0.3, Number(e.target.value) || 0.9))}
                  className="h-8"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Bar Height (px)</Label>
                <Input
                  type="number" step={1} min={10} max={120}
                  value={barHeight}
                  onChange={(e) => setBarHeight(Math.max(8, Number(e.target.value) || 28))}
                  className="h-8"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Quiet Zone</Label>
                <Input
                  type="number" step={1} min={0} max={20}
                  value={barMargin}
                  onChange={(e) => setBarMargin(Math.max(0, Number(e.target.value) || 0))}
                  className="h-8"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cell Padding (mm)</Label>
                <Input
                  type="number" step={0.1} min={0} max={5}
                  value={cellPadding}
                  onChange={(e) => setCellPadding(Math.max(0, Number(e.target.value) || 0))}
                  className="h-8"
                />
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
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={autoFitBarcode} onCheckedChange={(v) => setAutoFitBarcode(!!v)} /> Auto-fit barcode to label
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
                  <div key={idx} className="label-cell" style={{ width: conf.w, height: conf.h, padding: `${cellPadding}mm` }}>
                    {storeName && <div className="label-store">{storeName}</div>}
                    {showName && <div className="label-name">{i.name}</div>}
                    {showBarcode && (
                      <div className="label-barcode" style={{ height: barHeight + barMargin * 2 }}>
                        <Barcode
                          value={i.barcode}
                          preferred={barcodeFormat}
                          barWidth={barWidth}
                          barHeight={barHeight}
                          margin={barMargin}
                          autoFit={autoFitBarcode}
                        />
                      </div>
                    )}
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
        .label-barcode { width: 80%; display: flex; justify-content: center; align-items: center; }
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

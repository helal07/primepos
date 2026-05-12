import { useRef, useState } from "react";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const TEMPLATE_HEADERS = [
  "name", "sku", "barcode", "category", "brand", "unit",
  "purchase_price", "selling_price", "tax_percent",
  "stock_quantity", "alert_quantity", "product_type", "description",
];

const SAMPLE_ROWS = [
  ["iPhone 15 Pro", "IPH15P", "8801234567890", "Mobile", "Apple", "Pcs", "120000", "135000", "0", "10", "2", "general", "128GB Titanium"],
  ["Samsung Galaxy S24", "SGS24", "8801234567891", "Mobile", "Samsung", "Pcs", "95000", "108000", "0", "8", "2", "general", "256GB"],
];

type Row = Record<string, string>;
type Result = { row: number; status: "ok" | "error"; message: string; name?: string };

export default function ProductBulkImport() {
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const downloadTemplate = () => {
    const csv = Papa.unparse({ fields: TEMPLATE_HEADERS, data: SAMPLE_ROWS });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "products-import-template.csv";
    a.click();
  };

  const parseFile = (file: File) => {
    setResults([]);
    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const cleaned = res.data.filter((r) => r.name && r.name.trim());
        setRows(cleaned);
        if (!cleaned.length) toast.error("No valid rows found in CSV");
        else toast.success(`Parsed ${cleaned.length} rows. Click "Import" to save.`);
      },
      error: (err) => toast.error("Parse error: " + err.message),
    });
  };

  const lookupId = async (table: "categories" | "brands" | "units", name: string) => {
    if (!name?.trim()) return null;
    const { data } = await (supabase as any).from(table).select("id").ilike("name", name.trim()).limit(1).maybeSingle();
    if (data?.id) return data.id;
    const insert: any = { name: name.trim() };
    if (table === "units") insert.short_name = name.trim().slice(0, 4);
    const { data: created, error } = await (supabase as any).from(table).insert(insert).select("id").single();
    if (error) return null;
    return created.id;
  };

  const runImport = async () => {
    if (!rows.length) return;
    setImporting(true);
    setProgress(0);
    setResults([]);
    const out: Result[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        const [cat, brand, unit] = await Promise.all([
          lookupId("categories", r.category),
          lookupId("brands", r.brand),
          lookupId("units", r.unit),
        ]);
        const payload: any = {
          name: r.name.trim(),
          sku: r.sku || null,
          barcode: r.barcode || null,
          category_id: cat,
          brand_id: brand,
          unit_id: unit,
          purchase_price: Number(r.purchase_price) || 0,
          selling_price: Number(r.selling_price) || 0,
          tax_percent: Number(r.tax_percent) || 0,
          stock_quantity: Number(r.stock_quantity) || 0,
          alert_quantity: Number(r.alert_quantity) || 5,
          product_type: r.product_type || "general",
          description: r.description || null,
        };
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
        out.push({ row: i + 2, status: "ok", message: "Imported", name: r.name });
      } catch (e: any) {
        out.push({ row: i + 2, status: "error", message: e.message || "Failed", name: r.name });
      }
      setProgress(Math.round(((i + 1) / rows.length) * 100));
      setResults([...out]);
    }

    setImporting(false);
    qc.invalidateQueries({ queryKey: ["products"] });
    const ok = out.filter((x) => x.status === "ok").length;
    const err = out.length - ok;
    if (err === 0) toast.success(`Imported ${ok} products successfully`);
    else toast.warning(`Imported ${ok}, ${err} failed`);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Bulk Import Products" description="Upload a CSV file to import multiple products at once" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" /> Step 1 — Download Template
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Use the CSV template. Required field: <Badge variant="secondary">name</Badge>. Categories, brands, and units will be auto-created if missing.
          </p>
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" /> Download CSV Template
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4" /> Step 2 — Upload CSV
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && parseFile(e.target.files[0])}
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => fileRef.current?.click()} disabled={importing}>
              <Upload className="h-4 w-4 mr-2" /> Choose CSV File
            </Button>
            {rows.length > 0 && (
              <Button onClick={runImport} disabled={importing}>
                {importing ? `Importing... ${progress}%` : `Import ${rows.length} Products`}
              </Button>
            )}
          </div>

          {importing && <Progress value={progress} />}

          {rows.length > 0 && !results.length && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Preview ({rows.length} rows)</AlertTitle>
              <AlertDescription>Review then click Import.</AlertDescription>
            </Alert>
          )}

          {rows.length > 0 && (
            <div className="border rounded-lg max-h-80 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    {results.length > 0 && <TableHead>Status</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => {
                    const res = results[i];
                    return (
                      <TableRow key={i}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell>{r.sku}</TableCell>
                        <TableCell>{r.category}</TableCell>
                        <TableCell>{r.selling_price}</TableCell>
                        <TableCell>{r.stock_quantity}</TableCell>
                        {results.length > 0 && (
                          <TableCell>
                            {!res ? (
                              <Badge variant="secondary">Pending</Badge>
                            ) : res.status === "ok" ? (
                              <Badge className="bg-emerald-500"><CheckCircle2 className="h-3 w-3 mr-1" /> OK</Badge>
                            ) : (
                              <Badge variant="destructive" title={res.message}>Error</Badge>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {results.some((r) => r.status === "error") && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Errors</AlertTitle>
              <AlertDescription>
                <ul className="text-xs space-y-1 mt-2 max-h-40 overflow-auto">
                  {results.filter((r) => r.status === "error").map((r, i) => (
                    <li key={i}>Row {r.row} ({r.name}): {r.message}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

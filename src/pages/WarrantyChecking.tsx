import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, BadgeCheck, ShieldAlert, Loader2 } from "lucide-react";
import { rest } from "@/lib/restResource";
import { useToast } from "@/hooks/use-toast";
import { toFriendlyError } from "@/lib/friendlyError";
import { warrantyEndDate, daysRemaining } from "@/hooks/useWarranties";

interface FoundItem {
  id: string;
  serial_number: string | null;
  quantity: number;
  product?: { name?: string; sku?: string; has_warranty?: boolean; warranty_duration?: number | null; warranty_type?: string | null } | null;
  sale?: { invoice_number?: string; sale_date?: string; customer?: { name?: string } | null } | null;
}

export default function WarrantyChecking() {
  const { toast } = useToast();
  const [mode, setMode] = useState<"serial" | "invoice">("serial");
  const [term, setTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<FoundItem[]>([]);

  const search = async () => {
    const q = term.trim();
    if (!q) return;
    setLoading(true);
    try {
      let rows: FoundItem[] = [];
      if (mode === "serial") {
        rows = await rest.all<FoundItem>("sale_items", {
          filter: { serial_number: { like: `%${q}%` } },
          with: ["product", "sale", "sale.customer"],
          perPage: 100,
        });
      } else {
        const sales = await rest.all<{ id: string }>("sales", {
          filter: { invoice_number: { like: `%${q}%` } },
          perPage: 20,
        });
        if (sales.length) {
          rows = await rest.all<FoundItem>("sale_items", {
            filter: { sale_id: { in: sales.map((s) => s.id) } },
            with: ["product", "sale", "sale.customer"],
            perPage: 200,
          });
        }
      }
      setResults(rows);
      setSearched(true);
    } catch (e) {
      toast({ title: "Search failed", description: toFriendlyError(e as Error), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const coverage = (item: FoundItem) => {
    const months = Number(item.product?.warranty_duration ?? 0);
    const start = item.sale?.sale_date;
    if (!item.product?.has_warranty || !months || !start) return null;
    const end = warrantyEndDate(start, months, "months");
    return { end, days: daysRemaining(end), months };
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Warranty Checking" description="Check warranty coverage by IMEI / serial number or invoice number" />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Search</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Tabs value={mode} onValueChange={(v) => { setMode(v as "serial" | "invoice"); setSearched(false); setResults([]); }}>
            <TabsList>
              <TabsTrigger value="serial">IMEI / Serial</TabsTrigger>
              <TabsTrigger value="invoice">Invoice Number</TabsTrigger>
            </TabsList>
            <TabsContent value="serial" />
            <TabsContent value="invoice" />
          </Tabs>
          <div className="flex gap-2">
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") search(); }}
              placeholder={mode === "serial" ? "Enter IMEI or serial number" : "Enter invoice number"}
            />
            <Button onClick={search} disabled={loading || !term.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="ml-2 hidden sm:inline">Search</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {searched && results.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No sale found for “{term}”.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {results.map((item) => {
          const c = coverage(item);
          const active = c ? c.days > 0 : false;
          return (
            <Card key={item.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{item.product?.name || "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.product?.sku ? `SKU: ${item.product.sku} · ` : ""}
                      {item.serial_number ? `Serial: ${item.serial_number}` : "No serial"}
                    </div>
                  </div>
                  {c ? (
                    <Badge variant={active ? "default" : "destructive"} className="shrink-0">
                      {active ? <BadgeCheck className="mr-1 h-3 w-3" /> : <ShieldAlert className="mr-1 h-3 w-3" />}
                      {active ? `${c.days} days left` : "Expired"}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="shrink-0">No warranty</Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Invoice</div>
                    <div>{item.sale?.invoice_number || "-"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Customer</div>
                    <div>{item.sale?.customer?.name || "Walk-in"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Sale Date</div>
                    <div>{item.sale?.sale_date ? new Date(item.sale.sale_date).toLocaleDateString() : "-"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Warranty Until</div>
                    <div>{c ? c.end.toLocaleDateString() : "-"}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

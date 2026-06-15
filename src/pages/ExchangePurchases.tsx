import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { rest } from "@/lib/restResource";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Eye, Printer, Search } from "lucide-react";
import { format } from "date-fns";

export default function ExchangePurchases() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["exchange_purchases"],
    queryFn: async () => {
      return await rest.all<any>("exchange_purchases", { sort: "-created_at", perPage: 1000 });
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data || []).filter((r: any) => {
      const ms = status === "all" || r.status === status;
      if (!ms) return false;
      if (!q) return true;
      return [r.reference_no, r.seller_name, r.seller_phone, r.imei, r.product_name, r.brand, r.model]
        .some((v) => String(v ?? "").toLowerCase().includes(q));
    });
  }, [data, search, status]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Exchange Purchases"
        description="Used devices bought from sellers"
        actions={
          <Button size="sm" onClick={() => navigate("/exchange/purchases/add")}>
            <Plus className="h-4 w-4 mr-1" /> New Buy
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search reference, seller, phone, IMEI, model…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="in_stock">In Stock</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
              <SelectItem value="returned">Returned</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>IMEI</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : !filtered.length ? (
                <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No exchange purchases</TableCell></TableRow>
              ) : filtered.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{format(new Date(r.purchase_date), "yyyy-MM-dd")}</TableCell>
                  <TableCell className="font-mono text-xs">{r.reference_no}</TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{r.seller_name}</div>
                    <div className="text-xs text-muted-foreground">{r.seller_phone}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{r.product_name}</div>
                    <div className="text-xs text-muted-foreground">{[r.brand, r.model].filter(Boolean).join(" ")}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.imei || "—"}</TableCell>
                  <TableCell className="text-right">৳{Number(r.purchase_price).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === "sold" ? "default" : r.status === "in_stock" ? "secondary" : "outline"}>
                      {r.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="icon" variant="ghost" onClick={() => navigate(`/exchange/purchases/${r.id}`)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => navigate(`/exchange/agreement/${r.id}`)}>
                      <Printer className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
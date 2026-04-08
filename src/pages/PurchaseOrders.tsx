import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { usePurchaseOrders } from "@/hooks/usePurchases";

export default function PurchaseOrders() {
  const { data: orders, isLoading } = usePurchaseOrders();
  const [search, setSearch] = useState("");

  const filtered = (orders ?? []).filter((o: any) =>
    o.reference_number?.toLowerCase().includes(search.toLowerCase()) ||
    o.suppliers?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <PageHeader title="Purchase Orders" description="Manage purchase orders" />
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search orders..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 5 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No purchase orders found</TableCell></TableRow>
              ) : (
                filtered.map((o: any) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.reference_number || "—"}</TableCell>
                    <TableCell>{o.suppliers?.name || "—"}</TableCell>
                    <TableCell>{new Date(o.order_date).toLocaleDateString()}</TableCell>
                    <TableCell>{o.expected_date ? new Date(o.expected_date).toLocaleDateString() : "—"}</TableCell>
                    <TableCell><Badge variant={o.status === "approved" ? "default" : "outline"}>{o.status}</Badge></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

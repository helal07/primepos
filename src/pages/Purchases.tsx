import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, Trash2, Eye, MoreHorizontal, Pencil } from "lucide-react";
import { usePurchases, usePurchaseMutations } from "@/hooks/usePurchases";

const statusVariant = (s: string) => {
  switch (s) {
    case "received": return "default";
    case "partial": return "secondary";
    case "cancelled": return "destructive";
    default: return "outline";
  }
};

export default function Purchases() {
  const navigate = useNavigate();
  const { data: purchases, isLoading } = usePurchases();
  const { deletePurchase } = usePurchaseMutations();
  const [search, setSearch] = useState("");

  const filtered = (purchases ?? []).filter((p: any) =>
    p.reference_number?.toLowerCase().includes(search.toLowerCase()) ||
    p.suppliers?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <PageHeader title="Purchases" description="Manage purchase records" actions={
        <Button onClick={() => navigate("/purchases/add")}>
          <Plus className="h-4 w-4 mr-2" /> Add Purchase
        </Button>
      } />

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search purchases..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-[60px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No purchases found</TableCell></TableRow>
              ) : (
                filtered.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.reference_number || "—"}</TableCell>
                    <TableCell>{p.suppliers?.name || "—"}</TableCell>
                    <TableCell>{new Date(p.purchase_date).toLocaleDateString()}</TableCell>
                    <TableCell><Badge variant={statusVariant(p.status)}>{p.status}</Badge></TableCell>
                    <TableCell><Badge variant={p.payment_status === "paid" ? "default" : "outline"}>{p.payment_status}</Badge></TableCell>
                    <TableCell className="text-right font-medium">৳{Number(p.total_amount).toLocaleString()}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/purchases/${p.id}`)}>
                            <Eye className="h-4 w-4 mr-2" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/purchases/${p.id}/edit`)}>
                            <Pencil className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => deletePurchase.mutate(p.id)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
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

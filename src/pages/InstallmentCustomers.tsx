import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useInstallmentCustomers, useInstallmentCustomerMutations } from "@/hooks/useInstallments";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Search } from "lucide-react";

export default function InstallmentCustomers() {
  const navigate = useNavigate();
  const { data, isLoading } = useInstallmentCustomers();
  const { remove } = useInstallmentCustomerMutations();
  const [search, setSearch] = useState("");

  const filtered = data?.filter((c: any) => {
    const term = search.toLowerCase();
    return (
      c.customers?.name?.toLowerCase().includes(term) ||
      c.customers?.phone?.includes(term) ||
      c.guarantor_name?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Installment Customers" description="Manage installment customer registrations" actions={
        <Button onClick={() => navigate("/installment/customers/add")}>
          <Plus className="h-4 w-4 mr-2" /> Add Customer
        </Button>
      } />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Guarantor</TableHead>
              <TableHead>Guarantor Mobile</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
            )) : !filtered?.length ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No customers found</TableCell></TableRow>
            ) : filtered.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.customers?.name || "—"}</TableCell>
                <TableCell>{c.customers?.phone || "—"}</TableCell>
                <TableCell>{c.guarantor_name || "—"}</TableCell>
                <TableCell>{c.guarantor_mobile || "—"}</TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" onClick={() => remove.mutate(c.id)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

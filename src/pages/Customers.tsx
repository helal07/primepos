import { useState } from "react";
import { useCustomers, useCustomerMutations } from "@/hooks/useContacts";
import { useCustomerGroups } from "@/hooks/usePriceGroups";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Plus, Pencil, Trash2, Search, ChevronDown, Eye, Power, BookOpen, ShoppingCart, FileText, CreditCard, Filter, Printer, FileSpreadsheet,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Can } from "@/components/Can";


export default function Customers() {
  const navigate = useNavigate();
  const { data: customers, isLoading } = useCustomers();
  const { data: customerGroups } = useCustomerGroups();
  const { create, update, remove } = useCustomerMutations();
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [perPage, setPerPage] = useState("25");

  const handleEdit = (c: any) => navigate(`/customers/${c.id}/edit`);


  const filtered = (customers ?? []).filter((c: any) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(search)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.company && c.company.toLowerCase().includes(q));
    const matchesGroup = groupFilter === "all" || c.customer_group_id === groupFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && c.is_active) ||
      (statusFilter === "inactive" && !c.is_active);
    return matchesSearch && matchesGroup && matchesStatus;
  });

  const groupName = (id: string | null) =>
    customerGroups?.find((g: any) => g.id === id)?.name || "—";
  const contactId = (c: any) =>
    c.contact_id || `CO${String(c.id).slice(0, 4).toUpperCase()}`;

  const handleExportCSV = () => {
    const headers = [
      "Contact ID", "Business Name", "Name", "Email", "Tax number", "Credit Limit",
      "Opening Balance", "Customer Group", "Address", "Mobile", "Total Sale Due",
    ];
    const rows = filtered.map((c: any) => [
      contactId(c), c.company || "", c.name, c.email || "", c.tax_number || "",
      c.credit_limit ?? "", c.balance ?? 0, groupName(c.customer_group_id),
      (c.address || "").replace(/[\r\n,]+/g, " "), c.phone || "", c.balance ?? 0,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "customers.csv"; a.click();
    toast.success("CSV exported");
  };

  const activeFilterCount = (groupFilter !== "all" ? 1 : 0) + (statusFilter !== "all" ? 1 : 0);

  const FilterFields = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="space-y-1">
        <Label className="text-xs">Customer Group</Label>
        <Select value={groupFilter} onValueChange={setGroupFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All groups</SelectItem>
            {customerGroups?.map((g: any) => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Status</Label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label className="text-xs">Search</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Name, phone, email, company..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader title="Customers" description="Manage your Customers" actions={
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="md:hidden relative h-9 px-3">
                <Filter className="h-4 w-4" />
                <span className="ml-1.5 text-xs">Filter</span>
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl">
              <SheetHeader className="text-left mb-4">
                <SheetTitle className="flex items-center gap-2 text-base">
                  <Filter className="h-4 w-4 text-primary" /> Filters
                </SheetTitle>
              </SheetHeader>
              {FilterFields}
              <div className="mt-4 flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setGroupFilter("all"); setStatusFilter("all"); setSearch(""); }}>
                  Reset
                </Button>
                <SheetClose asChild>
                  <Button className="flex-1">Apply</Button>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
          <Can module="customers" action="create">
            <Button size="sm" className="h-9 px-3" onClick={() => navigate("/customers/add")}>
              <Plus className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Add Customer</span>
              <span className="ml-1.5 md:hidden text-xs">Add</span>
            </Button>
          </Can>
        </div>
      } />

      <div className="relative md:hidden">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-11 rounded-full bg-muted/50" />
      </div>

      <Card className="hidden md:block">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent>{FilterFields}</CardContent>
      </Card>


      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-base">All your Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="hidden md:flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show</span>
              <Select value={perPage} onValueChange={setPerPage}>
                <SelectTrigger className="w-[80px] h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">entries</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <FileSpreadsheet className="h-3.5 w-3.5 mr-1" /> Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="h-3.5 w-3.5 mr-1" /> Print
              </Button>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 w-[180px]" />
              </div>
            </div>
          </div>

          <div className="md:hidden space-y-2">
            {isLoading ? Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            )) : filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">No customers found</p>
            ) : filtered.slice(0, Number(perPage)).map((c: any) => (
              <div key={c.id} className="rounded-lg border p-3 flex items-start justify-between gap-2">
                <Link to={`/customers/${c.id}`} className="min-w-0">
                  <p className="font-semibold truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.phone || c.email || contactId(c)}</p>
                  <p className="text-xs mt-1">Due: <span className="font-medium">৳{Number(c.balance || 0).toLocaleString()}</span></p>
                </Link>
                <div className="flex flex-col items-end gap-1.5">
                  <Badge variant={c.is_active ? "default" : "secondary"} className="text-[10px]">{c.is_active ? "Active" : "Inactive"}</Badge>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => navigate(`/customers/${c.id}?action=pay`)}>
                      <CreditCard className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEdit(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block">


          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[110px]">Action</TableHead>
                  <TableHead>Contact ID</TableHead>
                  <TableHead>Business Name</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Tax number</TableHead>
                  <TableHead className="text-right">Credit Limit</TableHead>
                  <TableHead className="text-right">Opening Balance</TableHead>
                  <TableHead>Customer Group</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead className="text-right">Total Sale Due</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={13}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                )) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={13} className="text-center text-muted-foreground py-8">No customers found</TableCell></TableRow>
                ) : filtered.slice(0, Number(perPage)).map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                            Actions <ChevronDown className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48">
                          <DropdownMenuItem onClick={() => navigate(`/customers/${c.id}?action=pay`)}>
                            <CreditCard className="h-4 w-4 mr-2" /> Pay
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/customers/${c.id}`)}>
                            <Eye className="h-4 w-4 mr-2" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(c)}>
                            <Pencil className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => { if (confirm("Delete this customer?")) remove.mutate(c.id); }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => update.mutate({ id: c.id, is_active: !c.is_active })}
                          >
                            <Power className="h-4 w-4 mr-2" />
                            {c.is_active ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => navigate(`/customers/${c.id}#ledger`)}>
                            <BookOpen className="h-4 w-4 mr-2" /> Ledger
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/customers/${c.id}#sales`)}>
                            <ShoppingCart className="h-4 w-4 mr-2" /> Sales
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/customers/${c.id}#documents`)}>
                            <FileText className="h-4 w-4 mr-2" /> Documents &amp; Note
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{contactId(c)}</TableCell>
                    <TableCell>{c.company || "—"}</TableCell>
                    <TableCell>
                      <Link to={`/customers/${c.id}`} className="font-medium text-primary hover:underline">{c.name}</Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.email || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{c.tax_number || "—"}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {c.credit_limit == null ? "No Limit" : `৳${Number(c.credit_limit).toLocaleString()}`}
                    </TableCell>
                    <TableCell className="text-right">৳{Number(c.balance || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-muted-foreground">{groupName(c.customer_group_id)}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">{c.address || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{c.phone || "—"}</TableCell>
                    <TableCell className="text-right">৳{Number(c.balance || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={c.is_active ? "default" : "secondary"}>{c.is_active ? "Active" : "Inactive"}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          </div>

          <div className="text-xs md:text-sm text-muted-foreground mt-3">
            Showing 1 to {Math.min(Number(perPage), filtered.length)} of {filtered.length} entries
          </div>

        </CardContent>
      </Card>
    </div>
  );
}

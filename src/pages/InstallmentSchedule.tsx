import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAllSchedules, useSmsReminder } from "@/hooks/useInstallments";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare } from "lucide-react";
import { CustomerAvatar } from "@/components/installments/CustomerAvatar";

type FilterType = "all" | "overdue" | "today" | "tomorrow" | "this_week" | "this_month";

const shortDate = (v: any) => {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
};

export default function InstallmentSchedule() {
  const { data, isLoading } = useAllSchedules();
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const reminder = useSmsReminder();

  const filtered = useMemo(() => {
    if (!data) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const q = search.trim().toLowerCase();

    return data.filter((s: any) => {
      if (s.status === "paid") return false;
      const sale = s.installment_sales || {};
      const cust = sale.customers || {};
      if (q) {
        const hay = [sale.invoice_number, sale.invoice_no, cust.name, cust.phone, sale.products?.name]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filter === "all") return true;
      const due = new Date(s.due_date);
      due.setHours(0, 0, 0, 0);
      if (filter === "overdue") return due < today;
      if (filter === "today") return due.getTime() === today.getTime();
      if (filter === "tomorrow") return due.getTime() === tomorrow.getTime();
      if (filter === "this_week") return due >= today && due <= weekEnd;
      if (filter === "this_month") return due >= today && due <= monthEnd;
      return true;
    });
  }, [data, filter, search]);

  const filters: { label: string; value: FilterType }[] = [
    { label: "All Pending", value: "all" },
    { label: "Overdue", value: "overdue" },
    { label: "Today", value: "today" },
    { label: "Tomorrow", value: "tomorrow" },
    { label: "This Week", value: "this_week" },
    { label: "This Month", value: "this_month" },
  ];

  const isOverdue = (s: any) => {
    const d = new Date(s.due_date);
    d.setHours(0, 0, 0, 0);
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return d < t;
  };

  const statusColor = (s: string) => (s === "overdue" ? "destructive" : s === "partial" ? "secondary" : "outline");

  return (
    <div className="space-y-6">
      <PageHeader title="Installment Schedule" description="Upcoming collection dates and reminders" />

      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <Button key={f.value} variant={filter === f.value ? "default" : "outline"} size="sm" onClick={() => setFilter(f.value)}>
            {f.label}
          </Button>
        ))}
        <Input
          className="w-full sm:w-64 sm:ml-auto"
          placeholder="Search invoice, name or phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Guarantor</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Due</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24">SMS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={9}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
              ))
            ) : !filtered.length ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No pending schedules</TableCell></TableRow>
            ) : (
              filtered.map((s: any) => {
                const sale = s.installment_sales || s.installmentSale || {};
                const cust = sale.customers || sale.customer || {};
                const ic = sale.installment_customers || sale.installmentCustomer || {};
                const saleId = sale.id || s.installment_sale_id;
                return (
                  <TableRow
                    key={s.id}
                    className={saleId ? "cursor-pointer" : undefined}
                    onClick={() => saleId && navigate(`/installment/sales/${saleId}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CustomerAvatar path={ic.photo_url} name={cust.name || ic.name} />
                        <div className="leading-tight">
                          <p className="font-medium">{cust.name || ic.name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{cust.phone || ic.phone || "—"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="leading-tight">
                        <p>{ic.guarantor_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{ic.guarantor_mobile || "—"}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{sale.invoice_number || sale.invoice_no || "—"}</TableCell>
                    <TableCell>{sale.products?.name || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {shortDate(s.due_date)}
                      {isOverdue(s) && <span className="ml-1 text-xs text-destructive">overdue</span>}
                    </TableCell>
                    <TableCell className="text-right">{Number(s.amount || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{Number(s.paid_amount || 0).toFixed(2)}</TableCell>
                    <TableCell><Badge variant={statusColor(s.status)}>{s.status}</Badge></TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={reminder.isPending}
                        onClick={(e) => { e.stopPropagation(); reminder.mutate(s.id); }}
                      >
                        <MessageSquare className="h-3 w-3 mr-1" /> SMS
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

import { useState, useMemo } from "react";
import { useAllSchedules } from "@/hooks/useInstallments";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type FilterType = "all" | "today" | "tomorrow" | "this_week" | "this_month";

export default function InstallmentSchedule() {
  const { data, isLoading } = useAllSchedules();
  const [filter, setFilter] = useState<FilterType>("all");
  const { toast } = useToast();

  const filtered = useMemo(() => {
    if (!data) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    return data.filter((s: any) => {
      if (s.status === "paid") return false;
      if (filter === "all") return true;
      const due = new Date(s.due_date);
      due.setHours(0, 0, 0, 0);
      if (filter === "today") return due.getTime() === today.getTime();
      if (filter === "tomorrow") return due.getTime() === tomorrow.getTime();
      if (filter === "this_week") return due >= today && due <= weekEnd;
      if (filter === "this_month") return due >= today && due <= monthEnd;
      return true;
    });
  }, [data, filter]);

  const handleSmsReminder = (schedule: any) => {
    const customerName = schedule.installment_sales?.customers?.name || "Customer";
    const phone = schedule.installment_sales?.customers?.phone || "";
    toast({
      title: "SMS Reminder",
      description: `Reminder would be sent to ${customerName} (${phone}) for ${schedule.due_date} — Amount: ${Number(schedule.amount).toFixed(2)}`,
    });
  };

  const filters: { label: string; value: FilterType }[] = [
    { label: "All Pending", value: "all" },
    { label: "Today", value: "today" },
    { label: "Tomorrow", value: "tomorrow" },
    { label: "This Week", value: "this_week" },
    { label: "This Month", value: "this_month" },
  ];

  const statusColor = (s: string) => s === "overdue" ? "destructive" : s === "partial" ? "secondary" : "outline";

  return (
    <div className="space-y-6">
      <PageHeader title="Installment Schedule" description="Upcoming collection dates and reminders" />

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <Button key={f.value} variant={filter === f.value ? "default" : "outline"} size="sm" onClick={() => setFilter(f.value)}>
            {f.label}
          </Button>
        ))}
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-28">Reminder</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}><TableCell colSpan={9}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
            )) : !filtered.length ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No pending schedules</TableCell></TableRow>
            ) : filtered.map((s: any) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.installment_sales?.invoice_no || "—"}</TableCell>
                <TableCell>{s.installment_sales?.customers?.name || "—"}</TableCell>
                <TableCell>{s.installment_sales?.customers?.phone || "—"}</TableCell>
                <TableCell>{s.installment_sales?.products?.name || "—"}</TableCell>
                <TableCell>{s.due_date}</TableCell>
                <TableCell className="text-right">{Number(s.amount).toFixed(2)}</TableCell>
                <TableCell className="text-right">{Number(s.paid_amount || 0).toFixed(2)}</TableCell>
                <TableCell><Badge variant={statusColor(s.status)}>{s.status}</Badge></TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => handleSmsReminder(s)}>
                    <MessageSquare className="h-3 w-3 mr-1" /> SMS
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

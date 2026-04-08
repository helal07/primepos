import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { usePayroll, usePayrollMutations, useEmployees } from "@/hooks/useHRM";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const statusColor: Record<string, string> = { draft: "secondary", processed: "default", paid: "outline" };

export default function Payroll() {
  const { data: payrolls, isLoading } = usePayroll();
  const { data: employees } = useEmployees();
  const { upsertPayroll } = usePayrollMutations();
  const [open, setOpen] = useState(false);
  const now = new Date();
  const [form, setForm] = useState<any>({ employee_id: "", month: now.getMonth() + 1, year: now.getFullYear(), basic_salary: 0, allowances: 0, deductions: 0, overtime: 0, net_salary: 0, status: "draft", notes: "" });

  const calcNet = (f: any) => ({ ...f, net_salary: Number(f.basic_salary) + Number(f.allowances) + Number(f.overtime) - Number(f.deductions) });
  const updateField = (field: string, value: any) => { const updated = { ...form, [field]: value }; setForm(calcNet(updated)); };

  const handleSave = () => { upsertPayroll.mutate(form, { onSuccess: () => setOpen(false) }); };

  const handleGenerate = () => {
    const activeEmps = (employees ?? []).filter((e: any) => e.status === "active");
    activeEmps.forEach((emp: any) => {
      upsertPayroll.mutate({ employee_id: emp.id, month: now.getMonth() + 1, year: now.getFullYear(), basic_salary: emp.salary, allowances: 0, deductions: 0, overtime: 0, net_salary: emp.salary, status: "draft" });
    });
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Payroll" description="Monthly payroll management">
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleGenerate}>Generate This Month</Button>
          <Button onClick={() => { setForm({ employee_id: "", month: now.getMonth() + 1, year: now.getFullYear(), basic_salary: 0, allowances: 0, deductions: 0, overtime: 0, net_salary: 0, status: "draft", notes: "" }); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />Add Entry</Button>
        </div>
      </PageHeader>

      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Employee</TableHead><TableHead>Period</TableHead><TableHead>Basic</TableHead><TableHead>Allowances</TableHead><TableHead>Deductions</TableHead><TableHead>Net Salary</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? Array.from({ length: 4 }).map((_, i) => (<TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>)) :
              (payrolls ?? []).length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No payroll records</TableCell></TableRow> :
                (payrolls ?? []).map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.employees?.name || "—"}</TableCell>
                    <TableCell>{months[p.month - 1]} {p.year}</TableCell>
                    <TableCell>৳{Number(p.basic_salary).toLocaleString()}</TableCell>
                    <TableCell>৳{Number(p.allowances).toLocaleString()}</TableCell>
                    <TableCell>৳{Number(p.deductions).toLocaleString()}</TableCell>
                    <TableCell className="font-semibold">৳{Number(p.net_salary).toLocaleString()}</TableCell>
                    <TableCell><Badge variant={statusColor[p.status] as any}>{p.status}</Badge></TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Payroll Entry</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Employee *</Label>
              <Select value={form.employee_id} onValueChange={(v) => { const emp = (employees ?? []).find((e: any) => e.id === v); updateField("employee_id", v); if (emp) updateField("basic_salary", emp.salary); }}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{(employees ?? []).filter((e: any) => e.status === "active").map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Month</Label><Input type="number" min={1} max={12} value={form.month} onChange={(e) => updateField("month", Number(e.target.value))} /></div>
              <div className="space-y-2"><Label>Year</Label><Input type="number" value={form.year} onChange={(e) => updateField("year", Number(e.target.value))} /></div>
              <div className="space-y-2"><Label>Basic Salary</Label><Input type="number" value={form.basic_salary} onChange={(e) => updateField("basic_salary", Number(e.target.value))} /></div>
              <div className="space-y-2"><Label>Allowances</Label><Input type="number" value={form.allowances} onChange={(e) => updateField("allowances", Number(e.target.value))} /></div>
              <div className="space-y-2"><Label>Deductions</Label><Input type="number" value={form.deductions} onChange={(e) => updateField("deductions", Number(e.target.value))} /></div>
              <div className="space-y-2"><Label>Overtime</Label><Input type="number" value={form.overtime} onChange={(e) => updateField("overtime", Number(e.target.value))} /></div>
            </div>
            <div className="text-lg font-semibold">Net Salary: ৳{Number(form.net_salary).toLocaleString()}</div>
            <div className="space-y-2"><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => updateField("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="processed">Processed</SelectItem><SelectItem value="paid">Paid</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.employee_id || upsertPayroll.isPending}>{upsertPayroll.isPending ? "Saving..." : "Save"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

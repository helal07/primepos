import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Check, X } from "lucide-react";
import { useLeaveRequests, useLeaveMutations, useEmployees } from "@/hooks/useHRM";

const statusColor: Record<string, string> = { pending: "secondary", approved: "default", rejected: "destructive" };

export default function LeaveManagement() {
  const { data: leaves, isLoading } = useLeaveRequests();
  const { data: employees } = useEmployees();
  const { createLeave, updateLeaveStatus } = useLeaveMutations();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ employee_id: "", leave_type: "casual", start_date: "", end_date: "", days: 1, reason: "" });

  const handleSave = () => { createLeave.mutate(form, { onSuccess: () => setOpen(false) }); };

  return (
    <div className="space-y-4">
      <PageHeader title="Leave Management" description="Manage leave requests" actions={<Button onClick={() => { setForm({ employee_id: "", leave_type: "casual", start_date: "", end_date: "", days: 1, reason: "" }); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />New Request</Button>} />

      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Employee</TableHead><TableHead>Type</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Days</TableHead><TableHead>Status</TableHead><TableHead className="w-28">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? Array.from({ length: 4 }).map((_, i) => (<TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>)) :
              (leaves ?? []).length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No leave requests</TableCell></TableRow> :
                (leaves ?? []).map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.employees?.name || "—"}</TableCell>
                    <TableCell className="capitalize">{l.leave_type}</TableCell>
                    <TableCell>{l.start_date}</TableCell>
                    <TableCell>{l.end_date}</TableCell>
                    <TableCell>{l.days}</TableCell>
                    <TableCell><Badge variant={statusColor[l.status] as any}>{l.status}</Badge></TableCell>
                    <TableCell>
                      {l.status === "pending" && (
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => updateLeaveStatus.mutate({ id: l.id, status: "approved" })}><Check className="h-4 w-4 text-primary" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => updateLeaveStatus.mutate({ id: l.id, status: "rejected" })}><X className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Leave Request</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Employee *</Label>
              <Select value={form.employee_id} onValueChange={(v) => setForm({ ...form, employee_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{(employees ?? []).filter((e: any) => e.status === "active").map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Leave Type</Label>
              <Select value={form.leave_type} onValueChange={(v) => setForm({ ...form, leave_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="annual">Annual</SelectItem><SelectItem value="sick">Sick</SelectItem><SelectItem value="casual">Casual</SelectItem><SelectItem value="unpaid">Unpaid</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>From</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
              <div className="space-y-2"><Label>To</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
              <div className="space-y-2"><Label>Days</Label><Input type="number" value={form.days} onChange={(e) => setForm({ ...form, days: Number(e.target.value) })} /></div>
            </div>
            <div className="space-y-2"><Label>Reason</Label><Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={2} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.employee_id || !form.start_date || createLeave.isPending}>{createLeave.isPending ? "Saving..." : "Submit"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

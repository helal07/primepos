import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, MapPin } from "lucide-react";
import { useAttendance, useAttendanceMutations, useEmployees } from "@/hooks/useHRM";

const statusColor: Record<string, string> = { present: "default", absent: "destructive", late: "secondary", half_day: "outline" };

export default function Attendance() {
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0, 10));
  const { data: records, isLoading } = useAttendance(dateFilter);
  const { data: employees } = useEmployees();
  const { markAttendance } = useAttendanceMutations();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ employee_id: "", date: dateFilter, status: "present", check_in: "", check_out: "", notes: "", latitude: null as number | null, longitude: null as number | null });

  const handleSave = () => {
    const payload: any = { ...form };
    if (!payload.check_in) delete payload.check_in;
    if (!payload.check_out) delete payload.check_out;
    if (!payload.latitude) { delete payload.latitude; delete payload.longitude; }
    markAttendance.mutate(payload, { onSuccess: () => setOpen(false) });
  };

  const captureLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setForm((f) => ({ ...f, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
      });
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Attendance" description="Track daily attendance" actions={<Button onClick={() => { setForm({ employee_id: "", date: dateFilter, status: "present", check_in: "", check_out: "", notes: "", latitude: null, longitude: null }); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />Mark Attendance</Button>} />
      <Input type="date" className="max-w-[200px]" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />

      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Employee</TableHead><TableHead>Date</TableHead><TableHead>Check In</TableHead><TableHead>Check Out</TableHead><TableHead>Status</TableHead><TableHead>Location</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? Array.from({ length: 4 }).map((_, i) => (<TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>)) :
              (records ?? []).length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No attendance records</TableCell></TableRow> :
                (records ?? []).map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.employees?.name || "—"}</TableCell>
                    <TableCell>{r.date}</TableCell>
                    <TableCell>{r.check_in ? new Date(r.check_in).toLocaleTimeString() : "—"}</TableCell>
                    <TableCell>{r.check_out ? new Date(r.check_out).toLocaleTimeString() : "—"}</TableCell>
                    <TableCell><Badge variant={statusColor[r.status] as any}>{r.status}</Badge></TableCell>
                    <TableCell>{r.latitude ? <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{Number(r.latitude).toFixed(4)}, {Number(r.longitude).toFixed(4)}</span> : "—"}</TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mark Attendance</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Employee *</Label>
              <Select value={form.employee_id} onValueChange={(v) => setForm({ ...form, employee_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{(employees ?? []).filter((e: any) => e.status === "active").map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div className="space-y-2"><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="present">Present</SelectItem><SelectItem value="absent">Absent</SelectItem><SelectItem value="late">Late</SelectItem><SelectItem value="half_day">Half Day</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Check In</Label><Input type="time" value={form.check_in} onChange={(e) => setForm({ ...form, check_in: e.target.value ? `${form.date}T${e.target.value}:00` : "" })} /></div>
              <div className="space-y-2"><Label>Check Out</Label><Input type="time" value={form.check_out} onChange={(e) => setForm({ ...form, check_out: e.target.value ? `${form.date}T${e.target.value}:00` : "" })} /></div>
            </div>
            <Button variant="outline" size="sm" onClick={captureLocation}><MapPin className="h-4 w-4 mr-1" />Capture GPS Location</Button>
            {form.latitude && <p className="text-xs text-muted-foreground">📍 {form.latitude.toFixed(6)}, {form.longitude?.toFixed(6)}</p>}
            <div className="space-y-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.employee_id || markAttendance.isPending}>{markAttendance.isPending ? "Saving..." : "Save"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

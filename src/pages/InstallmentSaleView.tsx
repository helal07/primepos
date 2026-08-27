import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  useInstallmentSale,
  useInstallmentSchedules,
  useInstallmentCollections,
  useCollectionMutations,
  useSmsReminder,
} from "@/hooks/useInstallments";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, CreditCard, FileText, MessageSquare, Printer } from "lucide-react";
import { CustomerAvatar } from "@/components/installments/CustomerAvatar";

const money = (v: any) => Number(v || 0).toFixed(2);
const shortDate = (v: any) => {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
};

export default function InstallmentSaleView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: sale } = useInstallmentSale(id || null);
  const { data: schedules, refetch } = useInstallmentSchedules(id || null);
  const { data: collections } = useInstallmentCollections(id || null);
  const { collect } = useCollectionMutations();
  const reminder = useSmsReminder();

  const [open, setOpen] = useState(false);
  const [row, setRow] = useState<any>(null);
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState("cash");
  const [notes, setNotes] = useState("");

  if (!sale) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  const rows = schedules ?? [];
  const ic = (sale as any).installment_customers || {};
  const customer = (sale as any).customers || {};
  const totalDue = rows.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
  const totalPaid = rows.reduce((s: number, r: any) => s + Number(r.paid_amount || 0), 0);
  const outstanding = Math.max(0, totalDue - totalPaid);

  const openCollect = (sch: any) => {
    setRow(sch);
    setAmount(Number(sch.amount || 0) - Number(sch.paid_amount || 0));
    setMethod("cash");
    setNotes("");
    setOpen(true);
  };

  const handleCollect = async () => {
    await collect.mutateAsync({
      installment_sale_id: id!,
      schedule_id: row.id,
      amount,
      payment_method: method,
      notes: notes || null,
    });
    setOpen(false);
    refetch();
  };

  const statusColor = (s: string) =>
    s === "paid" ? "default" : s === "overdue" ? "destructive" : s === "partial" ? "secondary" : "outline";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Invoice ${sale.invoice_no || sale.invoice_number || ""}`}
        description="Installment invoice, payment status and collections"
      />

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
        <Button variant="outline" onClick={() => navigate(`/installment/agreement/${id}`)}>
          <FileText className="h-4 w-4 mr-2" /> Agreement
        </Button>
        <Button variant="outline" onClick={() => navigate(`/installment/agreement/${id}?only=schedule`)}>
          <Printer className="h-4 w-4 mr-2" /> Print Schedule
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex items-center gap-3 mb-2">
              <CustomerAvatar path={ic.photo_url} name={customer.name || ic.name} className="h-12 w-12" />
              <div>
                <p className="font-medium">{customer.name || ic.name || "—"}</p>
                <p className="text-muted-foreground">{customer.phone || ic.phone || "—"}</p>
              </div>
            </div>
            {ic.permanent_address && <p>{ic.permanent_address}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Guarantor</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex items-center gap-3 mb-2">
              <CustomerAvatar path={ic.guarantor_photo_url} name={ic.guarantor_name} className="h-12 w-12" />
              <div>
                <p className="font-medium">{ic.guarantor_name || "—"}</p>
                <p className="text-muted-foreground">{ic.guarantor_mobile || "—"}</p>
              </div>
            </div>
            {ic.guarantor_permanent_address && <p>{ic.guarantor_permanent_address}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Payment Status</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>Total: <strong>{money(sale.total_amount)}</strong></p>
            <p>Down Payment: {money(sale.down_payment)}</p>
            <p>Scheduled: {money(totalDue)}</p>
            <p>Collected: {money(totalPaid)}</p>
            <p>Outstanding: <strong>{money(outstanding)}</strong></p>
            <Badge variant={statusColor(sale.status)} className="mt-1">{sale.status}</Badge>
          </CardContent>
        </Card>
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SN</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-40">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!rows.length ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No schedule generated</TableCell></TableRow>
            ) : rows.map((s: any) => (
              <TableRow key={s.id}>
                <TableCell>{s.serial_no ?? s.installment_no}</TableCell>
                <TableCell>{shortDate(s.due_date)}</TableCell>
                <TableCell className="text-right">{money(s.amount)}</TableCell>
                <TableCell className="text-right">{money(s.paid_amount)}</TableCell>
                <TableCell className="text-right">{money(Number(s.amount || 0) - Number(s.paid_amount || 0))}</TableCell>
                <TableCell><Badge variant={statusColor(s.status)}>{s.status}</Badge></TableCell>
                <TableCell>
                  {s.status !== "paid" && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => openCollect(s)}>
                        <CreditCard className="h-3 w-3 mr-1" /> Collect
                      </Button>
                      <Button size="sm" variant="outline" disabled={reminder.isPending} onClick={() => reminder.mutate(s.id)}>
                        <MessageSquare className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {!!collections?.length && (
        <Card>
          <CardHeader><CardTitle className="text-base">Collection History</CardTitle></CardHeader>
          <CardContent className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collections.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell>{shortDate(c.collected_at || c.created_at)}</TableCell>
                    <TableCell className="text-right">{money(c.amount)}</TableCell>
                    <TableCell className="capitalize">{c.payment_method || "—"}</TableCell>
                    <TableCell>{c.notes || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Collect Payment — SN {row?.serial_no ?? row?.installment_no}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Amount</Label><Input type="number" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} /></div>
            <div>
              <Label>Payment Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="bkash">bKash</SelectItem>
                  <SelectItem value="nagad">Nagad</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button onClick={handleCollect} disabled={collect.isPending || amount <= 0}>
              {collect.isPending ? "Collecting..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

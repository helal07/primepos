import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  useInstallmentSales,
  useInstallmentSchedules,
  useAllSchedules,
  useCollectionMutations,
  useSmsReminder,
} from "@/hooks/useInstallments";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CreditCard, MessageSquare } from "lucide-react";
import { CustomerAvatar } from "@/components/installments/CustomerAvatar";

const shortDate = (v: any) => {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
};

export default function InstallmentCollections() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { data: sales } = useInstallmentSales();
  const [saleId, setSaleId] = useState(params.get("sale") || "");
  const { data: schedules, refetch } = useInstallmentSchedules(saleId || null);
  const { data: allSchedules, refetch: refetchAll } = useAllSchedules();
  const { collect } = useCollectionMutations();
  const reminder = useSmsReminder();

  const [dueSearch, setDueSearch] = useState("");
  const [collectDialog, setCollectDialog] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState("cash");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (params.get("sale")) setSaleId(params.get("sale")!);
  }, [params]);

  const openCollect = (sch: any, saleIdForRow?: string) => {
    setSelectedSchedule({ ...sch, _saleId: saleIdForRow || sch.installment_sale_id || saleId });
    setAmount(Number(sch.amount || 0) - Number(sch.paid_amount || 0));
    setMethod("cash");
    setNotes("");
    setCollectDialog(true);
  };

  const handleCollect = async () => {
    if (!selectedSchedule) return;
    await collect.mutateAsync({
      installment_sale_id: selectedSchedule._saleId,
      schedule_id: selectedSchedule.id,
      amount,
      payment_method: method,
      notes: notes || null,
    });
    setCollectDialog(false);
    refetch();
    refetchAll();
  };

  const statusColor = (s: string) =>
    s === "paid" ? "default" : s === "overdue" ? "destructive" : s === "partial" ? "secondary" : "outline";

  const selectedSale = sales?.find((s: any) => s.id === saleId);

  // Due list — every unpaid schedule across all installment sales.
  const dueList = useMemo(() => {
    const q = dueSearch.trim().toLowerCase();
    return (allSchedules ?? [])
      .filter((s: any) => s.status !== "paid")
      .filter((s: any) => {
        if (!q) return true;
        const sale = s.installment_sales || {};
        const cust = sale.customers || {};
        return [sale.invoice_number, sale.invoice_no, cust.name, cust.phone]
          .filter(Boolean).join(" ").toLowerCase().includes(q);
      });
  }, [allSchedules, dueSearch]);

  return (
    <div className="space-y-6">
      <PageHeader title="Installment Collection" description="Collect payments against installment schedules" />

      {/* Due installment list */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="font-semibold">Due Installment List</h3>
            <Badge variant="secondary">{dueList.length}</Badge>
            <Input
              className="w-full sm:w-64 sm:ml-auto"
              placeholder="Search invoice, name or phone"
              value={dueSearch}
              onChange={(e) => setDueSearch(e.target.value)}
            />
          </div>

          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>SN</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-44">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!dueList.length ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No due installments</TableCell></TableRow>
                ) : dueList.map((s: any) => {
                  const sale = s.installment_sales || {};
                  const cust = sale.customers || {};
                  const ic = sale.installment_customers || {};
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CustomerAvatar path={ic.photo_url} name={cust.name || ic.name} />
                          <div className="leading-tight">
                            <p className="font-medium">{cust.name || ic.name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{cust.phone || ic.phone || "—"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell
                        className="font-medium cursor-pointer underline-offset-2 hover:underline"
                        onClick={() => navigate(`/installment/sales/${sale.id}`)}
                      >
                        {sale.invoice_number || sale.invoice_no || "—"}
                      </TableCell>
                      <TableCell>{s.serial_no ?? s.installment_no}</TableCell>
                      <TableCell className="whitespace-nowrap">{shortDate(s.due_date)}</TableCell>
                      <TableCell className="text-right">{Number(s.amount || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right">{Number(s.paid_amount || 0).toFixed(2)}</TableCell>
                      <TableCell><Badge variant={statusColor(s.status)}>{s.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => openCollect(s, sale.id)}>
                            <CreditCard className="h-3 w-3 mr-1" /> Collect
                          </Button>
                          <Button size="sm" variant="outline" disabled={reminder.isPending} onClick={() => reminder.mutate(s.id)}>
                            <MessageSquare className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Per-invoice collection */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Select Sale</Label>
              <Select value={saleId} onValueChange={setSaleId}>
                <SelectTrigger><SelectValue placeholder="Select sale" /></SelectTrigger>
                <SelectContent>
                  {sales?.filter((s: any) => s.id).map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {(s.invoice_no || s.invoice_number) + " — " + (s.customers?.name || "")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedSale && (
              <>
                <div><Label>Customer</Label><Input value={selectedSale.customers?.name || ""} readOnly className="bg-muted" /></div>
                <div><Label>Remaining</Label><Input value={Number(selectedSale.remaining_amount || 0).toFixed(2)} readOnly className="bg-muted" /></div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {saleId && (
        <div className="border rounded-lg overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SN</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules?.map((sch: any) => (
                <TableRow key={sch.id}>
                  <TableCell>{sch.serial_no ?? sch.installment_no}</TableCell>
                  <TableCell>{shortDate(sch.due_date)}</TableCell>
                  <TableCell className="text-right">{Number(sch.amount || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right">{Number(sch.paid_amount || 0).toFixed(2)}</TableCell>
                  <TableCell><Badge variant={statusColor(sch.status)}>{sch.status}</Badge></TableCell>
                  <TableCell>
                    {sch.status !== "paid" && (
                      <Button size="sm" variant="outline" onClick={() => openCollect(sch, saleId)}>
                        <CreditCard className="h-3 w-3 mr-1" /> Collect
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={collectDialog} onOpenChange={setCollectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Collect Payment — SN {selectedSchedule?.serial_no ?? selectedSchedule?.installment_no}</DialogTitle>
          </DialogHeader>
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

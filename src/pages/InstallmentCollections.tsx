import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useInstallmentSales, useInstallmentSchedules, useCollectionMutations } from "@/hooks/useInstallments";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CreditCard } from "lucide-react";

export default function InstallmentCollections() {
  const [params] = useSearchParams();
  const { data: sales } = useInstallmentSales();
  const [saleId, setSaleId] = useState(params.get("sale") || "");
  const { data: schedules, refetch } = useInstallmentSchedules(saleId || null);
  const { collect } = useCollectionMutations();

  const [collectDialog, setCollectDialog] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState("cash");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (params.get("sale")) setSaleId(params.get("sale")!);
  }, [params]);

  const openCollect = (sch: any) => {
    setSelectedSchedule(sch);
    setAmount(sch.amount - (sch.paid_amount || 0));
    setMethod("cash");
    setNotes("");
    setCollectDialog(true);
  };

  const handleCollect = async () => {
    if (!selectedSchedule) return;
    await collect.mutateAsync({
      installment_sale_id: saleId,
      schedule_id: selectedSchedule.id,
      amount,
      payment_method: method,
      notes: notes || null,
    });
    setCollectDialog(false);
    refetch();
  };

  const statusColor = (s: string) => s === "paid" ? "default" : s === "overdue" ? "destructive" : s === "partial" ? "secondary" : "outline";

  const selectedSale = sales?.find((s: any) => s.id === saleId);

  return (
    <div className="space-y-6">
      <PageHeader title="Installment Collection" description="Collect payments against installment schedules" />

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Select Sale</Label>
              <Select value={saleId} onValueChange={setSaleId}>
                <SelectTrigger><SelectValue placeholder="Select sale" /></SelectTrigger>
                <SelectContent>
                  {sales?.filter((s: any) => s.id).map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.invoice_no} — {s.customers?.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedSale && (
              <>
                <div><Label>Customer</Label><Input value={selectedSale.customers?.name || ""} readOnly className="bg-muted" /></div>
                <div><Label>Remaining</Label><Input value={Number(selectedSale.remaining_amount).toFixed(2)} readOnly className="bg-muted" /></div>
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
                  <TableCell>{sch.serial_no}</TableCell>
                  <TableCell>{sch.due_date}</TableCell>
                  <TableCell className="text-right">{Number(sch.amount).toFixed(2)}</TableCell>
                  <TableCell className="text-right">{Number(sch.paid_amount || 0).toFixed(2)}</TableCell>
                  <TableCell><Badge variant={statusColor(sch.status)}>{sch.status}</Badge></TableCell>
                  <TableCell>
                    {sch.status !== "paid" && (
                      <Button size="sm" variant="outline" onClick={() => openCollect(sch)}>
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
          <DialogHeader><DialogTitle>Collect Payment — SN {selectedSchedule?.serial_no}</DialogTitle></DialogHeader>
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
            <Button onClick={handleCollect} disabled={collect.isPending}>{collect.isPending ? "Collecting..." : "Confirm"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

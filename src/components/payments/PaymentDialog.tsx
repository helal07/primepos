import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, CreditCard, Banknote, Smartphone, Building } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export interface PaymentRow {
  amount: number;
  payment_method: string;
  payment_note: string;
}

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
  onFinalize: (payments: PaymentRow[], paymentStatus: string) => void;
  isPending?: boolean;
  title?: string;
  /** Outstanding amount from the customer's earlier invoices. */
  previousDue?: number;
}

const METHODS = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "card", label: "Card", icon: CreditCard },
  { value: "bkash", label: "bKash", icon: Smartphone },
  { value: "bank", label: "Bank", icon: Building },
];

export function PaymentDialog({ open, onOpenChange, totalAmount, onFinalize, isPending, title = "Finalize Payment", previousDue = 0 }: PaymentDialogProps) {
  const [payments, setPayments] = useState<PaymentRow[]>([
    { amount: totalAmount, payment_method: "cash", payment_note: "" },
  ]);

  useEffect(() => {
    if (open) {
      setPayments([{ amount: totalAmount, payment_method: "cash", payment_note: "" }]);
    }
  }, [open, totalAmount]);

  const prevDue = Math.max(0, Number(previousDue) || 0);
  const receivable = totalAmount + prevDue;
  const totalPaying = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  // Extra money beyond the invoice total is accepted as payment only while the
  // customer still has old dues; anything above the receivable is change return.
  const changeReturn = Math.max(0, totalPaying - receivable);
  const balance = Math.max(0, totalAmount - totalPaying);
  const adjustedToOldDues = Math.max(0, Math.min(totalPaying, receivable) - totalAmount);
  const remainingLedger = Math.max(0, receivable - Math.min(totalPaying, receivable));

  const paymentStatus = totalPaying >= totalAmount ? "paid" : totalPaying > 0 ? "partial" : "unpaid";

  const hasNegative = payments.some(p => Number(p.amount) < 0);
  const emptyCart = !(totalAmount > 0);
  const overReceivable = prevDue > 0 && totalPaying > receivable + 0.001;
  const validationError = emptyCart
    ? "Add items to the cart before finalizing payment."
    : hasNegative
      ? "Payment amounts cannot be negative."
      : overReceivable
        ? `Received amount cannot exceed the receivable amount (৳${receivable.toFixed(2)}).`
        : null;
  const canFinalize = !validationError && !isPending;


  const updatePayment = (idx: number, field: keyof PaymentRow, value: any) => {
    setPayments(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const addRow = () => {
    setPayments(prev => [...prev, { amount: balance, payment_method: "cash", payment_note: "" }]);
  };

  const removeRow = (idx: number) => {
    if (payments.length <= 1) return;
    setPayments(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-lg max-h-[100dvh] sm:max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 rounded-lg bg-muted">
            <div className="text-xs text-muted-foreground">Total Payable</div>
            <div className="text-lg font-bold">৳{totalAmount.toFixed(2)}</div>
          </div>
          <div className="p-3 rounded-lg bg-primary/10">
            <div className="text-xs text-muted-foreground">Total Paying</div>
            <div className="text-lg font-bold text-primary">৳{totalPaying.toFixed(2)}</div>
          </div>
          <div className={`p-3 rounded-lg ${changeReturn > 0 ? "bg-green-50" : balance > 0 ? "bg-destructive/10" : "bg-muted"}`}>
            <div className="text-xs text-muted-foreground">{changeReturn > 0 ? "Change Return" : "Balance Due"}</div>
            <div className={`text-lg font-bold ${changeReturn > 0 ? "text-green-600" : balance > 0 ? "text-destructive" : ""}`}>
              ৳{(changeReturn > 0 ? changeReturn : balance).toFixed(2)}
            </div>
          </div>
        </div>

        <Separator />

        {/* Payment Rows */}
        <div className="space-y-3">
          {payments.map((row, idx) => (
            <div key={idx} className="flex gap-2 items-end">
              <div className="w-28">
                {idx === 0 && <Label className="text-xs">Amount</Label>}
                <Input
                  type="number"
                  min={0}
                  value={row.amount}
                  onChange={(e) => updatePayment(idx, "amount", parseFloat(e.target.value) || 0)}
                  onFocus={(e) => e.currentTarget.scrollIntoView({ block: "center", behavior: "smooth" })}
                  className="h-9"
                />
              </div>
              <div className="w-28">
                {idx === 0 && <Label className="text-xs">Method</Label>}
                <Select value={row.payment_method} onValueChange={(v) => updatePayment(idx, "payment_method", v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {METHODS.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                {idx === 0 && <Label className="text-xs">Note</Label>}
                <Input
                  value={row.payment_note}
                  onChange={(e) => updatePayment(idx, "payment_note", e.target.value)}
                  onFocus={(e) => e.currentTarget.scrollIntoView({ block: "center", behavior: "smooth" })}
                  placeholder="Optional note"
                  className="h-9"
                />
              </div>
              {payments.length > 1 && (
                <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive shrink-0" onClick={() => removeRow(idx)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <Button variant="outline" size="sm" onClick={addRow} className="w-full">
          <Plus className="h-4 w-4 mr-2" /> Add Payment Row
        </Button>

        {/* Status indicator */}
        <div className="text-center text-sm">
          Payment Status:{" "}
          <span className={`font-semibold ${paymentStatus === "paid" ? "text-green-600" : paymentStatus === "partial" ? "text-amber-600" : "text-destructive"}`}>
            {paymentStatus === "paid" ? "Fully Paid" : paymentStatus === "partial" ? "Partial Payment" : "Credit (Unpaid)"}
          </span>
        </div>
        {validationError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive text-center">
            {validationError}
          </div>
        )}
        </div>

        <DialogFooter className="shrink-0 border-t bg-background px-6 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (!canFinalize) return;
              onFinalize(payments.filter(p => p.amount > 0), paymentStatus);
            }}
            disabled={!canFinalize}
          >
            {isPending ? "Processing..." : "Finalize Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

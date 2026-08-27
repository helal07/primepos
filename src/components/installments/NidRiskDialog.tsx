import { AlertTriangle, Phone } from "lucide-react";
import type { NidRiskResult } from "@/hooks/useInstallments";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  result: NidRiskResult | null;
  onCancel: () => void;
  onContinue: () => void;
  continueLabel?: string;
}

const money = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Informational cross-tenant credit warning. Shows every other shop where this
 * NID still has unpaid installment dues, with that shop's contact phone so the
 * retailer can call and ask about the customer's payment behaviour.
 */
export function NidRiskDialog({ open, result, onCancel, onContinue, continueLabel = "Continue anyway" }: Props) {
  const shops = result?.shops ?? [];
  const totalDue = shops.reduce((s, x) => s + x.due_amount, 0);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" /> Outstanding installments found elsewhere
          </DialogTitle>
          <DialogDescription>
            This NID has unpaid installment dues at {shops.length} other shop{shops.length > 1 ? "s" : ""} —
            total due {money(totalDue)}. Call the shop to check the customer's payment behaviour before approving.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[50vh] overflow-auto">
          {shops.map((s, i) => (
            <div key={i} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{s.shop_name}</p>
                  {s.customer_name && (
                    <p className="text-xs text-muted-foreground">Registered as: {s.customer_name}</p>
                  )}
                </div>
                {s.shop_phone ? (
                  <a
                    href={`tel:${s.shop_phone}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    <Phone className="h-4 w-4" /> {s.shop_phone}
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground">No shop phone</span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                <div><span className="text-muted-foreground block text-xs">Financed</span>{money(s.financed_amount)}</div>
                <div><span className="text-muted-foreground block text-xs">Paid</span>{money(s.paid_amount)}</div>
                <div className="font-semibold text-destructive">
                  <span className="text-muted-foreground block text-xs font-normal">Due</span>{money(s.due_amount)}
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Overdue</span>
                  {s.overdue_count > 0
                    ? <Badge variant="destructive">{s.overdue_count} installment(s)</Badge>
                    : <span className="text-muted-foreground">None</span>}
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                {s.sales_count} installment sale{s.sales_count > 1 ? "s" : ""}
                {s.last_payment_at ? ` · last payment ${new Date(s.last_payment_at).toLocaleDateString()}` : ""}
              </p>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={onContinue}>{continueLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

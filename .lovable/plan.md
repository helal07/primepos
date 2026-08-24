# POS invoice fixes: correct paid amount, auto-print, restructured amounts block

## Problem 1 — Invoice shows full amount as due

Confirmed cause: in `src/pages/POS.tsx` the receipt dialog renders `<SaleInvoice ... />` **without** the `payments` prop. `SaleInvoice` defaults `payments = []`, so `computeSaleTotals` reports Received = 0 and Balance Due = full total — even though the multi-payment rows were saved correctly. (The Sale View page passes payments and shows correct numbers.)

Fix:
- Keep the payment rows entered at checkout in POS state and pass them to `SaleInvoice`.
- Also read persisted payments with `useSalePayments(lastSaleId)` and prefer them once loaded, so reprints and refreshes stay accurate.
- Show the sale's real payment status (paid / partial / due) derived from those payments.

## Problem 2 — After a successful sale: auto print + clear POS screen

- On success, immediately reset the POS screen (cart, customer, discount, shipping, serial selections) instead of waiting for the "New Sale" button.
- The invoice dialog opens and fires the print routine automatically once, as soon as sale + items + payments are loaded — no second confirmation click. The dialog still keeps manual "Print again" / "View Sales" / "Close" actions.
- Guard the auto-print with a "printed once per sale" flag so it does not re-trigger on re-render.

## Problem 3 — Restructure the Amounts block (as in reference image 2)

New order in `src/components/sales/SaleInvoice.tsx` (and the same order on the Sale View totals card):

```text
Sub Total          (sum of all items)
Discount           (hidden when 0)
Tax / Shipping     (hidden when 0)
Total              (after discount)
Previous Due       (hidden when 0)
Receivable Amount  (Previous Due + Total)
Today's Payment    (sum of payments on this sale; per-method rows kept above)
Total Balance      (Receivable - Today's Payment; shown as Due, Advance, or Paid in full)
```

Previous Due comes from the customer's other unpaid/partial sales (excluding the current invoice): sum of `total_amount - paid` across those sales. Walk-in sales (no customer) show no Previous Due. When there is no previous due, the invoice reads exactly as today (Sub Total → Discount → Total → Payment → Balance).

## Problem 4 — Allow receiving more than the invoice total when previous due exists

Today the payment dialog treats anything above the invoice total as "change return" and the sale is simply marked paid; extra money is not credited against the customer's old dues.

New rule:
- Walk-in / no previous due: the receivable ceiling stays the invoice total — extra beyond it is still shown as change return, not as a payment.
- Customer with previous due: the ceiling becomes **Receivable = Invoice Total + Previous Due**. Amounts above the invoice total (up to the ceiling) are accepted as real payment and reduce the customer's ledger balance; only money above the ceiling is treated as change return.
- The dialog shows Invoice Total, Previous Due, Receivable Amount, Paying now, Adjusted to old dues, and Remaining balance so the cashier sees exactly what is happening. Cash and multi-pay both follow this rule.
- The invoice's Today's Payment / Total Balance rows reflect the full received amount, so the printed bill matches image 2's layout (Receivable − Today's Payment = Total Balance).

Where the extra money lands: the current sale is capped at paid = its own total (payment status stays correct), and the surplus is recorded as payments applied to the customer's oldest outstanding sales (oldest first), so due reports, contact profile balance and the customer's ledger all update from a single source of truth. If a surplus remains after all old dues are cleared, it stays as advance on the current sale.


## Technical notes

- `src/lib/saleTotals.ts`: extend `computeSaleTotals` to accept an optional `previousDue` and return `receivable`, `paidToday`, and `totalBalance` while keeping the existing fields, so current callers keep working.
- New hook `usePreviousDue(customerId, excludeSaleId)` in `src/hooks/useSales.ts`: fetches the customer's `sales` with `payment_status in (due, partial, unpaid)` plus their `sale_payments`, sums the outstanding amounts, excludes the current sale.
- `src/components/sales/SaleInvoice.tsx`: accept `previousDue` prop, rewrite the Amounts rows in the order above with conditional rendering; amount-in-words continues to use the invoice Total.
- `src/pages/POS.tsx`: store `lastPayments`, reset the cart on success, pass `payments` + `previousDue` to `SaleInvoice`, add the auto-print effect.
- `src/pages/SaleView.tsx`: pass `previousDue` to `SaleInvoice` and mirror the new row order in the on-page totals card.
- Frontend/presentation only — no database or Laravel changes.

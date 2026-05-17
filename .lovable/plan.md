## Goal

Align our sale total / paid / due calculations with Ultimate POS conventions, and make the invoice and sale view show the same, correct numbers — driven by actual `sale_payments` rows, not an inferred `payment_status` string.

## Ultimate POS calculation rules (the standard we're adopting)

For one sale:

```
line_subtotal     = unit_price * qty
line_discount     = discount_type == "percent"
                      ? line_subtotal * (discount_value/100)
                      : discount_value * qty
line_after_disc   = line_subtotal - line_discount
line_tax          = line_after_disc * (tax_percent/100)
line_total        = line_after_disc + line_tax

subtotal          = sum(line_after_disc)        // tax-exclusive
order_discount    = fixed amount or % of subtotal
order_tax         = (subtotal - order_discount) * order_tax_rate
shipping          = shipping_cost
total_amount      = subtotal - order_discount + line_tax_total + order_tax + shipping

total_paid        = SUM(sale_payments.amount)   // source of truth
balance_due       = total_amount - total_paid

payment_status =
  total_paid <= 0                 -> "due"
  total_paid >= total_amount      -> "paid"
  else                            -> "partial"
```

Key principles:
1. `sale_payments` is the only source of truth for paid / due.
2. `payment_status` and `sales.due_amount` are derived columns, kept in sync by a trigger — never written by the UI directly.
3. Overpayment shows as `Advance` (negative balance), not clamped to 0.
4. Invoice displays the same numbers as the Sale View summary, byte-for-byte.

## Issues to fix (from prior audit)

1. `SaleInvoice.tsx` infers `paid` from `sale.payment_status` and a non-existent `sale.paid_amount` — ignores `sale_payments`.
2. `Math.max(0, total - paid)` hides overpayments.
3. `sales.due_amount` / `payment_status` are not recomputed when a payment row is inserted/updated/deleted → drift.
4. Invoice "items total" row prints `sale.subtotal` directly, never validated against the line sum.
5. Sale View summary card doesn't show Paid / Balance at all.

## Plan

### 1. Database — trigger to keep totals consistent (Ultimate POS style)

New migration:

- Function `public.recalc_sale_payment_status(sale_id uuid)`:
  - Reads `SUM(amount)` from `sale_payments` for that sale.
  - Reads `total_amount` from `sales`.
  - Updates `sales.due_amount = total_amount - total_paid` (allow negative for advance).
  - Updates `sales.payment_status` to `paid` / `partial` / `due` per rules above.
- Trigger on `sale_payments` AFTER INSERT / UPDATE / DELETE → calls the function with `NEW.sale_id` (or `OLD.sale_id` on delete).
- Trigger on `sales` AFTER UPDATE OF `total_amount` → recalc as well, so editing a sale's total reclassifies payment status.

No schema changes to columns; only triggers + function.

### 2. Shared calculator — `src/lib/saleTotals.ts` (new)

Single source of truth used by Sale View, Invoice, and WhatsApp share:

```ts
export function computeSaleTotals(sale, items, payments) {
  const subtotal = Number(sale.subtotal) || 0;
  const discount = Number(sale.discount_amount) || 0;
  const tax      = Number(sale.tax_amount) || 0;
  const shipping = Number(sale.shipping_cost) || 0;
  const total    = Number(sale.total_amount) || 0;
  const paid     = (payments ?? []).reduce((s,p) => s + Number(p.amount||0), 0);
  const balance  = total - paid;            // negative = advance
  const status   = paid <= 0 ? "due" : paid >= total ? "paid" : "partial";
  return { subtotal, discount, tax, shipping, total, paid, balance, status };
}
```

### 3. `SaleInvoice.tsx` — use real payments

- Accept `payments` prop (array of `sale_payments` rows).
- Replace the `paid_amount`/`payment_status` inference block with `computeSaleTotals(...)`.
- Amounts panel rows:
  - `Total`, `Received`, then either `Balance Due ৳ X` (balance > 0) or `Advance ৳ X` (balance < 0) or `Paid in full` (balance = 0).
- Drop the `Math.max(0, …)` clamp.

### 4. `SaleView.tsx` — pass payments to invoice + show paid/due

- Pass `payments={payments ?? []}` to `<SaleInvoice />`.
- Extend the right-aligned summary card to add:
  - `Paid` row (sum from `sale_payments`)
  - `Balance Due` / `Advance` row (color-coded)
- Use the same `computeSaleTotals` helper.

### 5. `whatsappShare.ts` — same helper

Update `buildSaleWhatsappUrl` to use `computeSaleTotals` so the WhatsApp message, the on-screen card, and the printed invoice are guaranteed identical.

### 6. (Optional, recommended) Backfill

One-off SQL in the same migration to recompute `due_amount` and `payment_status` for every existing sale, so historical rows are corrected immediately.

## Out of scope

- Changing how `sales.subtotal` / `sales.tax_amount` are computed at save time (that lives in `SaleAdd`/`SaleEdit` and isn't the user's complaint here).
- POS / installment-sale flows — only the standard Sales module is touched.
- UI redesign of the invoice — only the numeric block changes.

## Files touched

- New: `supabase/migrations/<timestamp>_sale_payment_totals.sql`
- New: `src/lib/saleTotals.ts`
- Edit: `src/components/sales/SaleInvoice.tsx`
- Edit: `src/pages/SaleView.tsx`
- Edit: `src/lib/whatsappShare.ts`

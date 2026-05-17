## Goal

Add a "Payments" breakdown section to the printed invoice (`SaleInvoice.tsx`) that lists each `sale_payments` row — date, method, and amount — followed by a summed `Received` row that matches the Amounts panel.

## Where it goes

Inserted directly **after the items table and before the "Invoice Amount In Words / Amounts" band**, so the reader sees totals → payment history → amounts panel.

Only renders when `payments.length > 0`.

## Markup

Use the same accent/band styling as the items table to stay visually consistent:

```
[band header]  Payments
+--------------------------------------------------+
| #  | Date       | Method     | Note  | Amount   |
+----+------------+------------+-------+----------+
| 1  | 10/05/2026 | Cash       | —     | ৳ 500.00 |
| 2  | 14/05/2026 | bKash      | adv.  | ৳ 300.00 |
+----+------------+------------+-------+----------+
|                                Received | ৳800.00|
+--------------------------------------------------+
```

- Date: `new Date(p.created_at).toLocaleDateString()`
- Method: `p.payment_method` (capitalized)
- Note: `p.payment_note || "—"`
- Amount: formatted with 2 decimals
- Totals row: sum from `computeSaleTotals(sale, payments).paid` so it stays in sync with the Amounts panel `Received` value.

## Files touched

- Edit: `src/components/sales/SaleInvoice.tsx` — add the section. `payments` prop is already wired through from SaleView.

## Out of scope

- No DB or hook changes (payments already fetched in SaleView and passed in).
- No layout change to the Amounts panel.
- Sale View on-screen Payment History card already exists and stays as is.

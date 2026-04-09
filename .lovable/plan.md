

# Sale/Purchase Edit → Full Form + Multi-Payment System

## Overview

Three changes: (1) Edit buttons redirect to full add/POS forms pre-populated with existing data instead of the simplified edit pages, (2) a new `sale_payments` and `purchase_payments` database table for recording multiple payment rows per transaction, (3) a payment dialog (inspired by the reference image) supporting split/fragmented and credit payments.

## Phase 1: Database — Payment Tables

Create two new tables via migration:

```sql
CREATE TABLE sale_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  payment_note text,
  tenant_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE purchase_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  payment_note text,
  tenant_id uuid,
  created_at timestamptz DEFAULT now()
);
```

Enable RLS, add tenant isolation policies, and add `set_tenant_id` triggers (same pattern as other tables).

## Phase 2: Payment Dialog Component

**New**: `src/components/payments/PaymentDialog.tsx`

A reusable dialog matching the reference image layout:
- Shows **Total Payable** (from sale/purchase total), **Total Paying** (sum of payment rows), **Change Return** or **Balance** (remaining due)
- Payment rows: each row has Amount, Payment Method (Cash/Card/bKash/Bank), Payment Note
- **"Add Payment Row"** button to add split payments
- **Payment status logic**: if total paying >= total payable → "paid"; if total paying > 0 but < total → "partial"; if 0 → "unpaid" (credit)
- **Credit payment**: user can finalize with 0 or partial amount → sets payment_status to "unpaid" or "partial"
- On "Finalize Payment", inserts all payment rows into `sale_payments` or `purchase_payments` and updates the parent record's `payment_status`

## Phase 3: Edit Routes → Redirect to Full Forms

### Sale Edit
- Change `/sales/:id/edit` route to load the **SaleAdd** page in "edit mode"
- Pass sale ID via route param or query string (e.g., `/sales/add?edit=<id>`)
- `SaleAdd.tsx` detects the `edit` param, fetches existing sale + items via `useSale(id)` + `useSaleItems(id)`, pre-populates all fields (customer, items, discount, notes)
- Items are fully editable (add/remove/change quantities)
- On submit, calls `updateSale` mutation instead of `createSale`

### Purchase Edit
- Same pattern: `/purchases/:id/edit` → redirects to `/purchases/add?edit=<id>`
- `PurchaseAdd.tsx` detects edit mode, pre-populates from existing purchase data
- On submit, calls `updatePurchase` instead of `createPurchase`

### POS Edit (for sales created via POS)
- Optionally, sale edit could redirect to `/pos?edit=<id>` for POS-created sales
- For simplicity, use `SaleAdd` page for all sale edits initially

**Files changed**:
- `src/pages/SaleAdd.tsx` — add edit mode detection, data pre-population, conditional mutation
- `src/pages/PurchaseAdd.tsx` — same edit mode logic
- `src/App.tsx` — update edit routes to redirect to add pages with query params (or keep routes and add redirects)
- Delete or repurpose `src/pages/SaleEdit.tsx` and `src/pages/PurchaseEdit.tsx`

## Phase 4: Integrate Payment Dialog

### In POS (`src/pages/POS.tsx`)
- Replace the current simple payment dialog with the new `PaymentDialog`
- After "Finalize Payment", create the sale + insert payment rows

### In SaleAdd (`src/pages/SaleAdd.tsx`)
- Add a "Complete Sale" button that opens `PaymentDialog`
- On finalize, create/update sale + insert payment rows

### In PurchaseAdd (`src/pages/PurchaseAdd.tsx`)
- Add payment dialog at the bottom payment section
- On save, create/update purchase + insert payment rows

### In View Pages
- `SaleView.tsx` and `PurchaseView.tsx` — show payment history (list of payment rows from `sale_payments`/`purchase_payments`)

## Phase 5: Hooks Update

**Edit**: `src/hooks/useSales.ts`
- Add `useSalePayments(saleId)` query
- Add `createSalePayments` mutation (bulk insert)

**Edit**: `src/hooks/usePurchases.ts`
- Add `usePurchasePayments(purchaseId)` query
- Add `createPurchasePayments` mutation (bulk insert)

## Files Summary

- **Migration**: Create `sale_payments` and `purchase_payments` tables with RLS
- **New**: `src/components/payments/PaymentDialog.tsx`
- **Edit**: `src/pages/SaleAdd.tsx` (edit mode + payment dialog)
- **Edit**: `src/pages/PurchaseAdd.tsx` (edit mode + payment dialog)
- **Edit**: `src/pages/POS.tsx` (use new PaymentDialog)
- **Edit**: `src/pages/SaleView.tsx` (show payment rows)
- **Edit**: `src/pages/PurchaseView.tsx` (show payment rows)
- **Edit**: `src/hooks/useSales.ts` (payment queries/mutations)
- **Edit**: `src/hooks/usePurchases.ts` (payment queries/mutations)
- **Edit**: `src/App.tsx` (update edit routes)
- **Remove/Simplify**: `src/pages/SaleEdit.tsx`, `src/pages/PurchaseEdit.tsx`

## Implementation Order

1. Database migration (payment tables)
2. Payment hooks
3. PaymentDialog component
4. Edit mode in SaleAdd + PurchaseAdd
5. Integrate PaymentDialog in POS, SaleAdd, PurchaseAdd
6. Update view pages with payment history
7. Route cleanup


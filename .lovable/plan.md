# Customer Credit Limit + Credit Sale Restriction

## 1. Database

Add `credit_limit` column to `customers`:

```sql
ALTER TABLE public.customers
ADD COLUMN credit_limit numeric NULL;
-- NULL = no limit (matches "Keep blank for no limit")
```

No RLS changes — existing policies cover the new column.

## 2. Customer Add/Edit form (`src/pages/Customers.tsx`)

- Add `credit_limit: ""` to `defaultForm`.
- Render a new field in the Add/Edit dialog grid: **Credit Limit** — numeric input with helper text "Keep blank for no limit".
- Map blank → `null`, otherwise `Number(value)` in `handleSubmit` payload.
- In `handleEdit`, hydrate `credit_limit` from the row (`""` if null).
- Add a **Credit Limit** column in the customer table (right-aligned, hidden on small screens). Show `—` when null, otherwise `৳{value}`.

Update `useContacts.ts` types/hook payload to include `credit_limit` (the hook spreads payload, so just widen the type if one exists; otherwise no change needed).

## 3. Block credit sale without contact info

Walk-in (no `customer_id`) must NOT be allowed to do a credit/partial sale. Enforce in three places:

### a) POS (`src/pages/POS.tsx`)

In `handleCreditSale`:

```ts
if (!customerId) {
  toast.error("Select a customer to record a credit sale. Walk-in customers must pay in full.");
  return;
}
```

Also gate the **Credit Sale** button: `disabled={cart.length === 0 || !customerId}` and add a tooltip/title "Select a customer first".

In `handleCompleteWithPayments`, when `paymentStatus !== "paid"` and `customerId` is set, check the selected customer's outstanding balance + this sale's due against `credit_limit`:

```ts
const dueNow = totalAmount - totalPaying;
if (dueNow > 0) {
  if (!customerId) { /* same toast as above */ return; }
  const cust = customers.find(c => c.id === customerId);
  const limit = cust?.credit_limit;
  if (limit != null && Number(cust.balance) + dueNow > Number(limit)) {
    toast.error(`Credit limit exceeded. Limit ৳${limit}, current balance ৳${cust.balance}.`);
    return;
  }
}
```

Apply the same gate inside the multi-payment finalize path triggered from PaymentDialog.

### b) Sale Add (`src/pages/SaleAdd.tsx`)

Mirror the same checks in `handleCreditSale` and in the multi-payment finalize handler. Disable the Credit Sale button when no customer is selected.

### c) Customer dropdown UX

Next to **Walk-in Customer** option in both POS and SaleAdd, leave label as-is but the disabled credit button + toast communicates the restriction. No further UI change needed.

**Customer Group** is needed some time because sometimes a base of customer get extra discount like 5% for inside location customers 10% automaticly get daily customers. search the documentation [https://ultimatefosters.com/docs/ultimatepos/products/selling-price-groups-sell-in-different-prices-wholesale-retail-or-for-different-prices-for-different-locations/](https://ultimatefosters.com/docs/ultimatepos/products/selling-price-groups-sell-in-different-prices-wholesale-retail-or-for-different-prices-for-different-locations/)

and make like that



&nbsp;

## Files

- New migration adding `credit_limit` to `customers`
- `src/pages/Customers.tsx` — add field, table column
- `src/hooks/useContacts.ts` — widen payload type if needed
- `src/pages/POS.tsx` — block walk-in credit + enforce limit
- `src/pages/SaleAdd.tsx` — same enforcement
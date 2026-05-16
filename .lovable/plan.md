## Goal

Remove the redundant **Transactions** page from the Superadmin panel. Keep **Payments** (`SuperPayments`) as the single source of truth — it already shows real payment data (approvals, gateway refs, amounts, periods).

## Why

`AdminTransactions.tsx` is a stub: it only lists tenants + package + status + subscription_end, with placeholder text saying "Transaction records will appear here once the gateway is connected." Every column it shows is already present in **Payments** and **Tenants**. **Payments** (`SuperPayments`) shows real `tenant_payments` rows (status, amount, gateway, reference, approved_at, period). Keeping both confuses users.

## Changes

- **Sidebar** (`src/components/admin/AdminSidebar.tsx`): remove the `Transactions` entry from `platformItems`.
- **Mobile nav** (`src/components/admin/AdminMobileNav.tsx`): remove the Transactions link if present.
- **Router** (`src/App.tsx`):
  - Remove `<Route path="transactions" …>` and the `AdminTransactions` lazy import.
  - Add a redirect: `/superadmin/transactions` → `/superadmin/payments` (so any bookmarks/old links don't 404).
- **Delete file** `src/pages/admin/AdminTransactions.tsx`.

## Not changing

- `SuperPayments` page itself — it already populates from `tenant_payments` as the user requested ("populate data according payments existing").
- No DB changes.

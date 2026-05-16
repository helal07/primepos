## Goal

Permissions configured by the Tenant Manager on each role must dynamically control what every user can see and do — across every module, not just expenses. If a permission box is unchecked, the user must not be able to perform that action via the menu, a button, a direct URL, or a direct API call.

## Current gaps

1. **Frontend routes** — only Sales, Purchases, Expenses, Customers, Suppliers are wrapped in `PermissionGate`. Products, Stock Adjustments / Transfers, POS, Accounting, HRM, Warranty, Exchange, Installments, Warehouses, Shipments, Returns, Quotations, Drafts, Invoices currently have only `ModuleGate` — anyone in the tenant can hit them.
2. **Sidebar & action buttons** — menu links and "Add / Edit / Delete / Receive / Pay" buttons are always rendered regardless of permission, so users see and click actions they cannot perform.
3. **POS** — no permission check at all (`sales.create` should be required).
4. **Database RLS inconsistencies**:
   - `purchases / purchase_items / purchase_orders / purchase_order_items / journal_entries / warehouse_stock` insert/update/delete policies check `has_module_permission(...)` only, with no Tenant Manager bypass → the tenant admin can be unexpectedly blocked.
   - Stock tables mix permission keys (`products` vs custom).
   - Several UPDATE/DELETE policies are missing the standard `(is_superadmin OR same tenant) AND (is_tenant_manager_or_above OR has_module_permission)` shape.

## Plan

### 1. Database — harden RLS (one migration)

Rewrite every PERMISSIVE INSERT/UPDATE/DELETE policy on the tables below to the same uniform shape:

```
(is_superadmin(uid) OR tenant_id = get_user_tenant_id(uid))
AND (is_tenant_manager_or_above(uid) OR has_module_permission(uid, '<module>', '<action>'))
```

Keep the existing `tenant_isolation_*` and `module_entitlement_required` RESTRICTIVE policies untouched. Tables and module keys:

| Table | Module |
|---|---|
| purchases, purchase_items, purchase_orders, purchase_order_items, purchase_payments | purchases |
| sales, sale_items, sale_payments, shipments | sales |
| products, product_variations, brands, categories, units, variations | products |
| stock_adjustments, stock_transfers, warehouse_stock, warehouses | products |
| customers, customer_groups, suppliers | contacts |
| expenses, expense_categories | expenses |
| chart_of_accounts, journal_entries, transactions | accounting |
| exchange_purchases | exchange |
| installment_customers, installment_sales, installment_payments | installments |
| warranty_claims, warranties | warranty |
| employees, attendance, leave_requests, payroll | hrm |
| cms_pages, store_settings, store_orders | cms |

### 2. Frontend — wrap every mutating route

In `src/App.tsx`, add `<PermissionGate module="…" action="view|create|edit">` inside every existing `<ModuleGate>` for: products & add/edit, categories, brands, units, variations, price-groups, stock-adjustments, stock-transfers, warehouses, warehouse-stock, POS (`sales.create`), sales orders/drafts/quotations/returns/invoices/shipments, purchase-returns, accounts/transactions/journal/trial-balance/cash-flow, employees/attendance/leave/payroll, warranty-claims, exchange/*, installment/*, CMS pages.

### 3. Sidebar — hide unauthorized links

In `src/components/layout/AppSidebar.tsx` (and `AppHeader`, `MobileBottomNav`), filter each menu item / group by `useMyPermissions()`. If the user has no `view` on the link's module, the link is not rendered; empty groups collapse. Tenant Manager / Superadmin bypass (already exposed as `isAdmin` by the hook).

### 4. Action buttons inside pages

Add a small `<Can module action>{children}</Can>` wrapper around `useCan`, then use it to hide:

- "Add" buttons on every list page (Products, Purchases, PurchaseOrders, Sales, Customers, Suppliers, Expenses, StockAdjustments, StockTransfers, JournalEntries, Employees, Exchange, Installments…).
- Row actions: Edit, Delete, Receive (PO), Mark Paid, Convert, Confirm, Pay.
- POS checkout button (`sales.create`).

Files to edit: `Purchases.tsx`, `PurchaseOrders.tsx`, `PurchaseAdd.tsx`, `Sales.tsx`, `SaleAdd.tsx`, `POS.tsx`, `Products.tsx`, `ProductAdd.tsx`, `StockAdjustments.tsx`, `StockTransfers.tsx`, `Customers.tsx`, `Suppliers.tsx`, `Expenses.tsx`, `JournalEntries.tsx`, `Employees.tsx`, `Exchange*.tsx`, `Installment*.tsx`, `WarrantyClaims.tsx`, `Warehouses.tsx`, `WarehouseStock.tsx`, `Shipments.tsx`.

### 5. QA matrix

After implementation, log in as three users:
1. Tenant Manager → full access in enabled modules.
2. Role with only `sales.view + sales.create` → sees only POS/Sales in menu, can create a sale, cannot edit/delete; Purchases menu hidden; direct URL `/purchases/add` shows Access Denied; DB rejects insert if forced.
3. Role with `purchases.view` only → sees Purchases list but no Add button, row Edit/Delete hidden, `/purchases/add` denied, Receive on PO denied.

## Notes for non-technical readers

- Whatever permissions you tick on a role will now drive both what that user **sees** (menu items, buttons) and what they can **do** (the backend will refuse blocked actions).
- The Tenant Manager always behaves as full admin and is unaffected.
- No changes to who owns the tenant or how you create roles — only enforcement is tightened across every screen.

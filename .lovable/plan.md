# Ultimate POS-style Granular Permissions

Rebuild the permission system from a 4-action model (view/create/edit/delete) into a granular sub-permission model matching Ultimate POS, with a tabbed editor and salesperson-based "view own only" scoping.

## 1. Database

### New permission catalog (seeded, not hard-coded in UI)
Create `permission_catalog` table — single source of truth so we can add new permissions later without code changes:
```
permission_catalog(key text PK, module text, group_label text, label text, description text, sort_order int)
```
Seed with the full Ultimate POS keys, e.g.:
- `sell.view_all`, `sell.view_own`, `sell.view_paid`, `sell.view_due`, `sell.view_partial`, `sell.view_overdue`
- `sell.add`, `sell.update`, `sell.delete`, `sell.commission_agent_view_own`
- `sell.payment_add`, `sell.payment_edit`, `sell.payment_delete`
- `sell.edit_price_on_pos`, `sell.edit_discount_on_pos`, `sell.discount_manage`
- `sell.access_types_of_service`, `sell.access_all_return`, `sell.access_own_return`, `sell.edit_invoice_number`
- Same depth for `purchase.*`, `product.*`, `stock.*`, `expense.*`, `customer.*`, `supplier.*`, `account.*`, `hrm.*`, `warranty.*`, `exchange.*`, `installment.*`, `cms.*`, `report.*`, `settings.*`.

### New grants table
```
role_permission_grants(role_id, permission_key, granted bool, PRIMARY KEY (role_id, permission_key))
```
Replaces the boolean columns on `role_permissions` for new-style permissions. Old `role_permissions` table kept for backward compat during transition.

### Salesperson scoping
Add `assigned_to uuid` (nullable, FK to auth.users) to `sales`, `purchases`, `exchange_purchases`, `installments`, `warranty_claims`. Default = `created_by`. "View own only" filters where `assigned_to = auth.uid() OR created_by = auth.uid()`.

### Core SQL helper
```
has_perm(_uid uuid, _key text) returns boolean  -- superadmin OR tenant manager OR grant exists
user_sell_scope(_uid uuid) returns text         -- 'all' | 'own' | 'none'
```

### RLS rewrite (key tables)
Rewrite SELECT, INSERT, UPDATE, DELETE policies on `sales`, `sale_items`, `sale_payments`, `purchases`, `purchase_payments`, `products`, `stock_adjustments`, `expenses`, etc. to use `has_perm()` with the new granular keys. SELECT policies honor view_all / view_own / status-filter keys.

## 2. Frontend — Tabbed Permission Editor

Rebuild `src/pages/admin/RolePermissions.tsx` (or equivalent):
- Left side: vertical tabs per module (Sell, Purchase, Stock, Products, Expenses, Customers, Suppliers, HRM, Accounting, Exchange, Installments, Warranty, Reports, Settings).
- Each tab: pulls from `permission_catalog` filtered by module, grouped by `group_label`, with checkboxes and a "Select all" per group + per module.
- Save writes diffs to `role_permission_grants`.
- Hide tabs whose module isn't enabled for the tenant (via `tenant_has_module`).

## 3. Permission hooks & gates (frontend enforcement)

- `usePermissions()` — loads all granted keys for current user once, caches in React Query.
- `useCan(key)` — boolean helper.
- `<Can perm="sell.add">` — replaces existing `<Can module action>` wrapper (keep old wrapper as shim).
- Update `AppSidebar` URL→permission map to use new keys (`sell.view_all` OR `sell.view_own` for Sales link, etc.).
- Update `PermissionGate` route wrapper in `App.tsx` to accept either legacy `module/action` or new `perm` prop.

## 4. Page-level enforcement (high-value pages first)

- **POS / Sale create**: hide price edit input unless `sell.edit_price_on_pos`; hide discount unless `sell.edit_discount_on_pos`; hide invoice-number field unless `sell.edit_invoice_number`.
- **Sales list**: filter rows when only `sell.view_own` granted; show status filter chips only for granted statuses; gate Add/Update/Delete buttons and payment action buttons.
- **Sale Returns**: route gated by `sell.access_all_return` / `sell.access_own_return`.
- **Purchase, Stock, Expense, Product, Customer, Supplier, HRM, Warranty, Exchange, Installment** lists/forms: gate Add/Edit/Delete and any sub-actions with their new keys.

## 5. Migration of existing roles

One-time data migration: for every existing `role_permissions` row, expand the 4 booleans into the equivalent granular keys (e.g. `can_view=true` for module `sales` → grant `sell.view_all`, `sell.view_paid`, `sell.view_due`, `sell.view_partial`, `sell.view_overdue`). This keeps current roles working after deploy.

## 6. Out of scope (for this iteration)

- Reorganizing sidebar groups.
- Per-location/branch scoping (Ultimate POS has it; we can add later).
- Audit log of permission changes (can follow up).

## Files

**New / migrations**
- `supabase/migrations/<ts>_granular_permissions.sql` — catalog + grants + helpers + RLS rewrites + salesperson columns + data migration.
- `src/hooks/usePermissions.ts`
- `src/components/Can.tsx` (rewrite, keep back-compat)
- `src/components/PermissionGate.tsx` (extend)
- `src/pages/admin/RolePermissionsEditor.tsx` (new tabbed editor)

**Edited**
- `src/App.tsx` (route gates)
- `src/components/layout/AppSidebar.tsx` (new perm keys)
- `src/pages/POS.tsx`, `Sales.tsx`, `SaleAdd.tsx`, `Purchases.tsx`, `PurchaseAdd.tsx`, `Products.tsx`, `ProductAdd.tsx`, `Expenses.tsx`, `Customers.tsx`, `Suppliers.tsx`, `Employees.tsx`, `WarrantyClaims.tsx`, `Exchange*.tsx`, `Installment*.tsx`, etc.

Approve and I'll execute the migration first, then the UI editor, then enforcement page-by-page.

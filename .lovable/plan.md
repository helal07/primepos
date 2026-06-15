# Stage 9 — Replace `supabase.from(table)` with Laravel REST resources

## Scope discovered
- **58 tables** queried from the SPA, across **52 files** and **15 hooks**.
- Hooks are already the chokepoint for ~95% of reads/writes, so converting hooks (not pages) collapses most of the surface area.

## Strategy: thin generic REST + module-by-module rollout

Instead of writing 58 bespoke Laravel controllers and 15 bespoke fetcher hooks, we ship a small generic layer first, then migrate one module at a time. Each substage stays self-contained and the app keeps working between substages (Supabase calls and Laravel calls coexist).

### Substage 9a — Foundation (this turn)

**Backend**
- `App\Http\Controllers\Api\RestController` — generic `index/show/store/update/destroy` for any whitelisted model. Tenant scoping is automatic via the `BelongsToTenant` trait (Stage 4). Auth required via `auth:sanctum`.
- `App\Support\RestRegistry` — single source of truth mapping `resource slug → [model, policy_key, allowed_filters, default_sort, search_columns, with_relations]`.
- `App\Http\Middleware\RestAccess` — calls `has_perm($module.view|create|edit|delete)` (mirrors existing `has_perm` SQL function).
- Routes: `GET/POST /api/rest/{resource}`, `GET/PATCH/DELETE /api/rest/{resource}/{id}`.
- Query support: `?filter[col]=val`, `?filter[col][op]=val` (`eq|neq|in|like|gt|gte|lt|lte`), `?sort=-created_at,name`, `?page=1&per_page=25`, `?with=relation1,relation2`, `?q=foo` (full-text on `search_columns`).
- Response envelope: `{ data, meta: { page, per_page, total } }` for lists; bare object for single resource.

**Frontend**
- `src/lib/restResource.ts` — typed helpers:
  ```ts
  rest.list<T>(resource, { filter, sort, page, perPage, with: [...], q })
  rest.get<T>(resource, id, { with })
  rest.create<T>(resource, body)
  rest.update<T>(resource, id, patch)
  rest.remove(resource, id)
  ```
  Returns plain arrays/objects; throws `ApiError` on failure (reuses Stage 8 `apiClient`).
- `src/hooks/rest/useRest.ts` — `useRestList(resource, query)`, `useRestOne`, plus a `useRestMutations(resource)` factory that returns `{ create, update, remove }` with `useMutation` + automatic `queryClient.invalidateQueries(["rest", resource])`.

**Migration ergonomics**
- A hook converts in roughly 10–30 lines of net diff because the existing React Query keys are preserved; only the fetcher swaps.

### Substage 9b — Inventory module
Hooks: `useInventory`, `useWarehouses`, `useImeiValidation`.
Tables: `products`, `product_variations`, `product_group_prices`, `categories`, `brands`, `units`, `warehouses`, `warehouse_stock`.

### Substage 9c — Contacts & Sales
Hooks: `useContacts`, `useSales`.
Tables: `customers`, `suppliers`, `sales`, `sale_items`, `sale_payments`, `shipments`, `shipment_status_history`.

### Substage 9d — Purchases & Stock movements
Hooks: `usePurchases`.
Tables: `purchases`, `purchase_items`, `purchase_payments`, `purchase_orders`, `purchase_order_items`, `stock_adjustments`, `stock_transfers`, `exchange_purchases`.

**Status (Stage 9d complete):**
- Backend: added relations to `Purchase` (supplier, items, payments) and `PurchaseItem` (purchase, product, variation). Created `PurchaseOrder` + `PurchaseOrderItem` models with relations.
- `RestRegistry` now exposes `purchases`, `purchase_items`, `purchase_payments`, `purchase_orders`, `purchase_order_items` (module = `purchases`).
- Frontend: `usePurchases.ts` fully migrated off Supabase to `rest.*` (list/get/create/update/remove). Singular Laravel relations aliased to plural Supabase shape (`supplier→suppliers`, `product→products`, `variation→product_variations`, `product.brand→products.brands`) so existing UI keeps working.
- `stock_adjustments` / `stock_transfers` were already migrated in 9b via `useInventory`/`useWarehouses`.
- `exchange_purchases` deferred to a later substage (exchange module overhaul).

### Substage 9e — Accounting & Expenses
Hooks: `useAccounting`, `useExpenses`.
Tables: `accounts`, `transactions`, `journal_entries`, `journal_entry_lines`, `expenses`, `expense_categories`.

**Status (Stage 9e complete):**
- Backend: created `JournalEntry` + `JournalEntryLine` models; added `account` relation to `Transaction`, `category/subCategory/warehouse` relations to `Expense`.
- `RestRegistry` exposes `accounts` (module=accounting), `transactions`, `journal_entries`, `journal_entry_lines`, `expenses` (module=expenses), `expense_categories`, `expense_payments`.
- `useAccounting.ts` and `useExpenses.ts` fully migrated to `rest.*`. Aliased `account→accounts`, `category→expense_categories`, `subCategory→sub`, `warehouse→warehouses` so existing pages keep working.

### Substage 9f — Installments
Hooks: `useInstallments`.
Tables: `installment_customers`, `installment_sales`, `installment_schedules`, `installment_collections`.

**Status (Stage 9f complete):**
- Backend: added relations to `InstallmentCustomer` (customer), `InstallmentSale` (customer, product, installmentCustomer, schedules), `InstallmentSchedule` (installmentSale), `InstallmentCollection` (schedule, installmentSale).
- `RestRegistry` exposes `installment_customers`, `installment_sales`, `installment_schedules`, `installment_collections` (module=installments).
- `useInstallments.ts` fully migrated to `rest.*`. Aliased `customer→customers`, `product→products`, `installmentCustomer→installment_customers`, `installmentSale→installment_sales`, `schedule→installment_schedules` so existing UI keeps working.

### Substage 9g — HRM
Hooks: `useHRM`.
Tables: `employees`, `attendance`, `leave_requests`, `payroll`.

**Status (Stage 9g complete):**
- Backend: created `Employee`, `Attendance`, `LeaveRequest`, `Payroll` models with `employee` relations.
- `RestRegistry` exposes `employees`, `attendance`, `leave_requests`, `payroll` (module=hrm).
- `useHRM.ts` fully migrated to `rest.*`. Aliased `employee→employees` for legacy UI. Attendance "upsert by (employee_id, date)" is now an explicit list-then-create-or-update since REST has no native upsert.

**Infra fix:** nginx 403 at `/` resolved — added `index index.html;` inside SPA `location /` so the server-level `index index.php` no longer leaks into the SPA root, and `entrypoint.sh` now chowns/chmods `public/app` so www-data can serve the Vite build.

### Substage 9h — Settings, Roles, SaaS Admin, Warranty CMS
Hooks: `useSettings`, `useRoles`, `useSaasAdmin`, `useWarrantyCms`.
Tables: `business_settings`, `roles`, `role_permissions`, `role_permission_grants`, `permission_catalog`, `user_roles`, `profiles`, `tenants`, `saas_packages`, `tenant_actions_log`, `landing_features`, `landing_reviews`, `warranty_claims`, `warranties`.

**Status (Stage 9h complete):**
- Backend: added `BusinessSetting`, `WarrantyClaim`, `Warranty`, `TenantActionsLog`, `LandingFeature`, `LandingReview` models. `BusinessSetting` deliberately skips `BelongsToTenant` because `tenant_id` is nullable for global rows; callers filter explicitly.
- `RestRegistry` now exposes `business_settings`, `roles`, `role_permissions`, `role_permission_grants`, `permission_catalog`, `user_roles`, `profiles`, `tenants`, `saas_packages`, `tenant_actions_log`, `landing_features`, `landing_reviews`, `warranty_claims`, `warranties`.
- `useSettings.ts` — list + per-tenant key/value upsert migrated to `rest.*`. Tenant lookup still uses Supabase auth's `profiles` row (auth itself is migrated in stage 10).
- `useRoles.ts` — fully migrated. Bulk delete-then-insert pattern (no native bulk delete in REST) reimplemented as list → delete each → create each, run with `Promise.all`. `useUpdateUserRole` mirrors the same pattern. Aliased `role→roles` for `useUsersWithRoles`.
- `useSaasAdmin.ts` — packages, tenants, tenant_actions_log, admin-mode landing features/reviews migrated. Aliased `package→saas_packages` on tenants. The `superadmin_delete_tenant` RPC stays on Supabase for now (cascade across many tables in one TX). `useLandingCms`, `useLandingCmsMutation`, public-mode `useLandingFeatures(false)` / `useLandingReviews(false)`, and `useLandingPricing` keep using Supabase because `/api/rest/*` requires `auth:sanctum`; opening a public REST surface is deferred to stage 9i.
- `useWarrantyCms.ts` — `warranty_claims` list + mutations migrated. Aliased `customer→customers`, `product→products`.

Deferred to **Stage 9i**: `useDashboard` (heavy aggregates — needs a dedicated `/api/dashboard/stats` endpoint that does the SUM/COUNT in SQL instead of N REST round-trips), public landing reads (need an unauthenticated REST surface), and `useEnabledModules` / `usePermission` (still call SQL functions directly via Supabase).

### Substage 9i — Dashboard, public landing, me-endpoints
Hooks: `useDashboard`, `useEnabledModules`, `usePermission`, public reads in `useSaasAdmin`.

**Status (Stage 9i complete):**
- Backend:
  - `DashboardController::stats` — replaces 14 chained Supabase queries with a single tenant-scoped call. All SUM/COUNT pushed into Postgres; daily/weekly series + recent activity + stock alerts + unpaid invoices come back in one response.
  - `MeController::modules` and `MeController::permissions` — wrap the `is_superadmin` / `is_tenant_manager_or_above` SQL functions and merge `role_permissions` + `role_permission_grants` server-side.
  - `PublicController` exposes `/api/public/landing/{features,reviews,pricing,cms/{key}}` — unauthenticated reads scoped to active rows and global (`tenant_id IS NULL`) CMS entries.
- Routes added under `/api/public/*` (no auth) and `/api/dashboard/stats`, `/api/me/*` (auth:sanctum + tenant.active).
- Frontend:
  - `useDashboardStats` reduced to a single `api.get` and a tiny client-side date formatter.
  - `useEnabledModules` and `useMyPermissions` call the new me-endpoints; Laravel returns `[]` for empty associative arrays so the hook coerces back to `{}`.
  - `useLandingCms`, `useLandingFeatures(false)`, `useLandingReviews(false)`, `useLandingPricing` now hit `/api/public/...`. `useLandingCmsMutation` writes through the authenticated `business_settings` REST resource (global `tenant_id IS NULL`).
- Only remaining Supabase data call outside `src/integrations/supabase/client.ts` and auth is `superadmin_delete_tenant` RPC (kept until Stage 10).

### Substage 9h — Settings, Roles, SaaS Admin, Landing
Hooks: `useSettings`, `useRoles`, `useSaasAdmin`, `useWarrantyCms`, `useDashboard`.
Tables: `business_settings`, `roles`, `role_permissions`, `profiles`, `tenants`, `tenant_payments`, `tenant_actions_log`, `tenant_notifications`, `saas_packages`, `sms_plans`, `sms_providers`, `sms_purchases`, `landing_features`, `landing_reviews`, `faq_entries`, `sitemap_entries`, `payment_gateways`, `payment_gateway_credentials`, `activity_log`, `sidebar_permission_audit`, `warranty_claims`.

After 9h: page-level call sites (`supabase.from(...)` outside hooks) get cleaned up; then Supabase Auth is the only remaining Supabase usage (handled in Stage 10).

## Risk + rollback
- Each substage updates one hook file + adds 1 entry per table to `RestRegistry`. If a substage breaks a page, reverting that hook restores prior behavior.
- During the migration, the same data is reachable through both Supabase RLS *and* Laravel REST + policies. Both paths must agree, which is the case since they both rely on `tenant_id` + role checks already enforced in DB.

## Stage 9a ✅ shipped
Foundation in place: `RestController`, `RestRegistry`, REST routes, `restResource.ts`, `useRest.ts`.

## Stage 9b ✅ shipped
- Eloquent relations added to `Product`, `ProductVariation`, `WarehouseStock`, `StockAdjustment`, `StockTransfer`.
- `stock_adjustments` and `stock_transfers` registered in `RestRegistry`; `variation` added to `warehouse_stock` with-list.
- `src/hooks/useInventory.ts` and `src/hooks/useWarehouses.ts` now talk to `/api/rest/*`. Query keys and response shapes (incl. `categories/brands/units/products/product_variations/warehouses` relation aliases) preserved so 27 consumer files keep working unchanged.
- `useProductStockMap` realtime channel replaced with 30 s polling.
- `useImeiValidation` deferred to 9c/9d (depends on tables not yet in registry).
- Product hard-delete falls back to soft-delete on FK violations; `product_group_prices` cleanup still uses Supabase until 9c.

## Next: Stage 9c — Contacts & Sales
`useContacts`, `useSales` → `customers`, `suppliers`, `sales`, `sale_items`, `sale_payments`, `shipments`, `shipment_status_history`.

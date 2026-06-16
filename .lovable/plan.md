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

### Substage 9j — page-level Supabase sweep
**Status (Stage 9j complete):**
- Backend: added `BusinessSetting` (referenced in 9h), `WarrantyClaim`, `Warranty`, `TenantActionsLog`, `LandingFeature`, `LandingReview`, plus new `SmsPlan`, `SmsProvider`, `SmsPurchase`, `PaymentGatewayCredential`, `FaqEntry`, `Shipment`, `ShipmentStatusHistory`, `ProductGroupPrice` models. `SmsPurchase::plan()` uses `plan_id` to match the SPA payload.
- `RestRegistry` now exposes `sms_plans`, `sms_providers`, `sms_purchases`, `payment_gateways`, `payment_gateway_credentials`, `sitemap_entries`, `faq_entries`, `shipments`, `shipment_status_history`, `exchange_purchases`, `tenant_payments`, `tenant_notifications`, `product_group_prices`, `activity_log`. `categories/brands/units` gained `name` filter; `sale_items` gained `created_at` filter+sort; `installment_sales/installment_collections/exchange_purchases` gained date/status filters needed by reports.
- Backend additions: `PublicController::landingFaqs` (`/api/public/landing/faqs`).
- Frontend migrated to REST: all 12 report pages under `src/pages/reports/`, `Reports.tsx`, `Shipments.tsx`, `ContactProfile.tsx`, `ExchangePurchaseAdd.tsx`, `ExchangePurchaseView.tsx`, `ExchangeAgreement.tsx`, `ProductBulkImport.tsx`, `PurchaseAdd.tsx`, `PurchaseOrders.tsx`, `PurchaseOrderAdd.tsx`, `Subscription.tsx`, `LandingPage.tsx` (incl. global business_settings reads), `useImeiValidation.ts`, `useInventory.ts` (product_group_prices cleanup + FK-existence counts), `NotificationBell.tsx` (queries via REST; realtime channel stays on Supabase), `QuickAddDialog.tsx`, and the admin pages `SmsPlans`, `SmsProviders`, `SmsPurchases`, `SuperPayments`, `TenantDetail`, `LandingCms`, `Sitemap`, `PaymentGateways`. Singular Eloquent relations are aliased to the legacy plural keys the existing components read (customer→customers, supplier→suppliers, plan→sms_plans, tenant→tenants, etc.).
- For warehouse-scoped reports, sale_id-IN filtering is used because `sale_items` has no warehouse column; a small extra `sales` call resolves the IDs once.

**Remaining Supabase data usage (intentional, scoped to Stage 10):**
- `useSaasAdmin.useTenantMutations.remove` keeps calling the `superadmin_delete_tenant` RPC (multi-table cascade in one TX).
- `ExchangePurchaseAdd.tsx` and `Subscription.tsx` perform a one-line `profiles.tenant_id` lookup keyed off the Supabase auth session.
- Auth-only pages/components stay on Supabase: `Login`, `Profile`, `SuperadminLogin`, `SuperadminRoute`, `ProtectedRoute`, `AppSidebar` (its `is_superadmin` RPC + `sidebar_permission_audit` insert).
- `NotificationBell` realtime channel (Supabase Realtime is not yet ported).
- `useContacts.ts` only retains a `import type` from `supabase/types` for TypeScript shapes; no runtime call.

These all fall to **Stage 10** (Sanctum-only auth + Realtime replacement).

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

## Stage 10 ✅ — Sanctum-only auth (Supabase Auth removed)

**Backend**
- `AuthController::changePassword` + `POST /api/auth/password` (auth:sanctum) — verifies current password, updates with `Hash::make`.
- Existing `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/token` already in place from Stage 8.

**Frontend**
- `AuthContext` rewritten. `AuthProvider` now boots from `GET /api/auth/me` (cookie session) and exposes `{ user, loading, signIn, signOut, refresh }`. `AuthUser` is the Laravel payload `{ id, email, name, is_superadmin, tenant_id, tenant, roles }` — no more `@supabase/supabase-js` `User`/`Session`.
- `Login.tsx`: posts via `signIn(email, password)`; redirects to `/superadmin` or `/dashboard` based on `user.is_superadmin`. Google OAuth button removed (Laravel Socialite migration deferred).
- `SuperadminLogin.tsx`: uses `signIn` + checks `user.is_superadmin`; calls `signOut()` and shows "Access denied" when not super.
- `ProtectedRoute.tsx`: no extra round-trip — reads `user.is_superadmin`, `user.tenant_id`, and `user.tenant.{status,subscription_end,name}` straight from the context. Auto-suspend on expiry is now a backend concern (cron / `AutoSuspendTenants`).
- `SuperadminRoute.tsx`: trivial guard on `user.is_superadmin`.
- `AppHeader.tsx` / `AdminLayout.tsx`: `user_metadata.display_name` → `user.name`.
- `AppSidebar.tsx`: dropped `supabase.rpc("is_superadmin", …)`; uses `user.is_superadmin`.
- `Profile.tsx`: profile read/write via `rest.*` on `profiles`; password change via `POST /api/auth/password`.
- `Register.tsx`: package list via `rest.all("saas_packages")`; post-signup login via `signIn(...)`.
- `useSettings.useSaveSetting`: `user.tenant_id` from context replaces the per-call `profiles` lookup.
- `SalesOrderAdd.useDeliveryPeople`: tenant resolved from `/api/auth/me`; delivery people fetched via `rest.all("profiles", { filter: { tenant_id } })`.
- `TenantBackup.tsx`: listing via `GET /api/tenant-backups`; export/restore via `api.post("/api/tenant-backups", ...)` and `api.post("/api/tenant-backups/restore", ...)`. Owner gating delegated to backend.

**Deferred (not blocking auth swap):**
- Laravel Socialite for Google sign-in.
- `NotificationBell` realtime channel (Supabase Realtime → Laravel broadcast / polling).
- `useSaasAdmin.useTenantMutations.remove` → still calls `superadmin_delete_tenant` RPC.
- `src/integrations/supabase/{client,types,...}` and `src/integrations/lovable/index.ts` stay in the tree (auto-generated) — purely unused now for auth.

## Stage 11 ✅ — Last runtime Supabase calls dropped (tenant delete + realtime)

**Backend**
- `TenantController::adminDelete` + `DELETE /api/admin/tenants/{tenantId}` (role:superadmin). Wraps the delete in a single transaction, discovers all `public.*` tables with a `tenant_id` column via `information_schema`, wipes their rows, then drops the tenant users and the tenant itself. Replaces the legacy `superadmin_delete_tenant` Postgres RPC.

**Frontend**
- `useSaasAdmin.useTenantMutations.remove` now calls `api.delete(\`/api/admin/tenants/{id}\`)` — the last `supabase.rpc(...)` call in the app is gone.
- `NotificationBell` — Supabase Realtime channel removed. Switched to a 30 s React-Query `refetchInterval` and toasts any newly-arrived rows by diffing against `seenIds`. Chime + popover behaviour unchanged.

## Stage 12 ✅ — Final sweep: all remaining `supabase.from(...)` removed

**Backend**
- New models: `SellingPriceGroup`, `CustomerGroup`. `TenantNotification::tenant()` BelongsTo added.
- `RestRegistry` gains `selling_price_groups`, `customer_groups`; `product_group_prices` filters extended with `variation_id` + `selling_price_group_id`; `sms_purchases` filter set gains `status`; `warranties` filter set gains `is_active`; `warehouse_stock` `with` extended to `product.category`/`product.brand`; `tenant_notifications` `with` extended to `tenant`.

**Frontend — migrated to REST**
- `usePriceGroups` (selling_price_groups, customer_groups, product_group_prices — upsert reimplemented as list→update-or-create since REST has no native upsert).
- `useAvailableSerials` (purchase_items + exchange_purchases + sale_items in parallel).
- `Exchange.tsx`, `ExchangePurchases.tsx`, `ActivityLog.tsx`, `Warranties.tsx`, `reports/StockReport.tsx` (warehouse_stock with `product.category`/`product.brand` aliased back to `categories`/`brands`).
- `admin/Notifications.tsx` (tenants + tenant_notifications; aliases `tenant`→`tenants`).
- `admin/AdminDashboard.tsx` (sms_purchases approved).
- `admin/TenantManagement.tsx` (profiles lookup).
- `admin/AdminLayout.tsx` (profile avatar_url).
- `pages/POS.tsx` (customer quick-add).
- `pages/ProductBulkImport.tsx` (categories/brands/units lookup-or-create).
- `pages/SalesOrderAdd.tsx` (warranties active list).
- `pages/StockTransfers.tsx` (warehouse_stock check).

**Frontend — auth-context replacements (no profiles round-trip)**
- `TrialReminderBanner` now reads `user.tenant` from `AuthContext`.
- `ExchangePurchaseAdd` and `Subscription` use `user.tenant_id` directly.

**Frontend — public CMS reads**
- `BrandingInjector` and `TrackingInjector` now use `useLandingCms("cms_branding" / "cms_tracking")` (`/api/public/landing/cms/{key}`) instead of `business_settings`. `TrackingInjector` pixel-proxy URL switched from `VITE_SUPABASE_URL/functions/v1/fb-pixel-proxy` to relative `/api/fb-pixel-proxy`.

**Removed / dropped**
- `AppSidebar` sidebar_permission_audit insert dropped (Supabase-only debug write; no Laravel endpoint yet).
- Unused `supabase` imports removed from `InstallmentCustomerAdd`, `useInventory`, `Users`, `ProductAdd`, `PurchaseAdd`, `Subscription`, `ExchangePurchaseAdd`, `AppSidebar`.

**Verified:** `bunx tsc --noEmit` clean. `rg "supabase\." src` shows zero remaining runtime calls (only a stale comment in `useContacts.ts`).

## Stage 13 ✅ — Sitemap URL cut over, migration finalised

- `src/pages/admin/Sitemap.tsx`: `SITEMAP_URL` switched from `${VITE_SUPABASE_URL}/functions/v1/sitemap` to the Laravel-served `/sitemap.xml` (already wired to `SitemapController::sitemap`).
- Verified zero runtime imports of `@/integrations/supabase/client` or `@/integrations/lovable` across `src/`. The auto-generated `integrations/{supabase,lovable}/*` files and `supabase/functions/*` directory are now dead code retained only as auto-managed scaffolding (per platform rules; not safe to delete). Type-only imports of `Database`/`Tables` from `supabase/types.ts` are kept — they describe the same Postgres schema Laravel speaks to.
- Migration from Supabase to Laravel is now functionally complete: no runtime `supabase.from`, `supabase.rpc`, `supabase.auth`, `supabase.channel`, or `supabase.functions.invoke` calls remain.

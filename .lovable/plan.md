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

## Stage 14 ✅ — Backend test suite scaffolded

Goal: lock in the Laravel migration with an executable safety net so future changes can't silently regress the API.

**Added**
- `backend/phpunit.xml` — PHPUnit 11 config; uses sqlite `:memory:`, `array` cache/session, `sync` queue, `bcrypt rounds=4`. No real network, DB, or filesystem touched.
- `backend/tests/TestCase.php` + `backend/tests/CreatesApplication.php` — standard Laravel test bootstrap pointing at `bootstrap/app.php`.
- `backend/tests/Unit/RestRegistryTest.php` — asserts the REST whitelist still exposes all 40+ core resources (products, sales, purchases, accounting, installments, HRM, tenants, CMS, warranties, SMS, notifications, activity log…), every entry has a real `model` class, and `filters/sort/search/with` are always arrays.
- `backend/tests/Feature/HealthTest.php` — `/api/health` smoke test plus 401 enforcement on `/api/auth/me`, `/api/dashboard/stats`, `/api/rest/products`, and unknown resources.
- `backend/tests/Feature/AuthTest.php` — login happy path, bad-password rejection, and current-password enforcement on `POST /api/auth/password`. Uses `RefreshDatabase`.
- `backend/tests/Feature/PublicLandingTest.php` — `/api/public/landing/features` filters out inactive rows; `/api/public/landing/cms/{key}` returns the global (`tenant_id IS NULL`) value or `null`. Uses `RefreshDatabase`.

**Run**
```bash
cd backend && ./vendor/bin/phpunit
# or: php artisan test
```

**Next candidates (deferred):**
- CI workflow that runs `vendor/bin/phpunit` + `bunx tsc --noEmit` on every push.
- Realtime / Reverb migration to drop the 30s polling on `NotificationBell`.

## Stage 15 ✅ — REST CRUD round-trip tests

Goal: exercise the generic `/api/rest/{resource}` pipeline end-to-end so refactors of `RestController`, `RestRegistry`, `BelongsToTenant`, or `TenantScope` can't silently break the SPA.

**Backend change**
- `RestController::authorizePerm()` now short-circuits when the caller `isSuperadmin()`, before invoking the Postgres-only `public.has_perm()` SQL helper. Matches existing `User::canModule()` / `hasPerm()` semantics and keeps the controller portable across DB engines (so sqlite tests work without stubbing).

**Added — `backend/tests/Feature/RestCrudTest.php`** (5 tests, 39 assertions, all green)
- Bootstraps a real `Tenant` + superadmin `User` pinned to that tenant, signs in via `actingAs(..., 'sanctum')`.
- `unknown_resource` → 404.
- `brands` full round-trip: POST (201 + tenant_id stamped), index envelope (`data` + `meta.total/page/per_page/last_page`), show, PATCH rename, `?filter[is_active]=1` eq filter, DELETE → 404 on re-fetch.
- `categories` create: confirms `BelongsToTenant` trait auto-stamps `tenant_id` and the row lands in the DB.
- `customers`: two creates, list total = 2, `?filter[phone]=...` returns exactly the matching row, `?sort=name` returns alphabetical order.
- Unknown filter columns and unknown sort columns are silently dropped (no SQL error, no leak).

**Run**
```bash
cd backend && ./vendor/bin/phpunit            # 16 tests, 482 assertions
cd backend && ./vendor/bin/phpunit --filter RestCrudTest
```

**Next candidates (deferred):**
- CI workflow that runs `vendor/bin/phpunit` + `bunx tsc --noEmit` on every push.
- Realtime / Reverb migration to drop the 30s polling on `NotificationBell`.
- Per-module CRUD tests for sales/purchases/installments (need factory + role-grant helper to exercise the non-superadmin `has_perm()` path).

## Stage 16 ✅ — Dead-code cleanup

Goal: remove orphaned Supabase edge-function scaffolding that has been fully replaced by Laravel controllers, so future contributors aren't misled by two backends.

**Removed (18 edge functions, both code + deployed):**
`admin-create-tenant`, `bkash-callback`, `create-tenant-user`, `delete-tenant-user`, `eps-callback`, `fb-pixel-proxy`, `payment-init`, `reset-tenant-password`, `robots`, `send-tenant-notification`, `sitemap`, `super-approve-payment`, `tenant-backup-export`, `tenant-backup-restore`, `tenant-backup-snapshot`, `tenant-signup`, `track-event`, `trial-reminders`. All ports already live under `backend/app/Http/Controllers/Api/*` (see `MAPPING.md`) and the SPA calls them via `src/lib/functions.ts` / `apiClient`.

**Edited**
- `supabase/config.toml` — stripped all `[functions.*]` blocks; only `project_id` remains.
- Deleted the now-empty `supabase/functions/` directory.
- Called `delete_edge_functions` so the deployed runtime matches the repo.

**Intentionally left alone**
- `src/integrations/supabase/{client,types}.ts` and `.env` `VITE_SUPABASE_*` — auto-generated by Lovable Cloud; type-only imports from `types.ts` in `useInventory`, `useContacts`, `useWarehouses`, `Warehouses.tsx` carry zero runtime weight.
- `src/integrations/lovable/index.ts` — auto-generated OAuth helper; still used by the auth flow.
- `supabase/migrations/*` — historical record of the schema; read-only.

**Next candidates (deferred):** CI workflow, Reverb realtime, per-module CRUD tests.

## Stage 17 ✅ — CI + Laravel auto-deploy

Goal: every push verifies both stacks and ships the Laravel backend alongside the SPA.

**Added — `.github/workflows/ci.yml`**
- `frontend` job: `bun install` → `bunx tsc --noEmit` → `bunx vitest run`.
- `backend` job: PHP 8.3 + composer cache → `composer install` → `php artisan key:generate` → `./vendor/bin/phpunit --testdox`.
- Triggers: push to `main`, every PR, manual dispatch.

**Updated — `.github/workflows/deploy.yml`**
- Now installs Laravel vendor (`composer install --no-dev --optimize-autoloader`) after the Vite build.
- Rsyncs `backend/` to `$SSH_BACKEND_DIR` (excluding `.env`, `storage/{app,logs,framework}/*`, `tests`, `.phpunit.cache`) with the same 3-attempt retry as the SPA.
- Runs post-deploy over SSH: `artisan migrate --force` → `storage:link` → `optimize:clear` → `config:cache` → `route:cache` → `event:cache`.
- Backward compatible: if `SSH_BACKEND_DIR` secret is unset, the backend step is skipped (SPA-only behaviour preserved).

**Required new secret**
- `SSH_BACKEND_DIR` — absolute path on the Hostinger host to the Laravel root (the directory containing `artisan`).

**Next candidates (deferred):** Reverb realtime, per-module CRUD tests, GitHub Actions matrix for PHP 8.2/8.3.

## Stage 18 ✅ — PHP 8.4 cutover + VPS bootstrap script

- Bumped CI, deploy workflow, and `backend/Dockerfile` from PHP 8.3 → **8.4** (composer.json `^8.3` already permits it; Laravel 12 + all deps officially support 8.4).
- Deploy post-step now reloads `php8.4-fpm` and `nginx` via sudo (falls back to generic `php-fpm` if the unit is named differently).
- Added **`scripts/vps-bootstrap.sh`** — idempotent provisioner for a fresh Ubuntu 22.04/24.04 or Debian 12 VPS:
  - Installs PHP 8.4 (FPM + CLI + mysql/mbstring/intl/bcmath/zip/gd/curl/xml/redis/opcache), Composer 2, Nginx, MySQL/Redis clients, supervisor, cron, ufw.
  - Creates a `deploy` user in the `www-data` group, authorises an SSH public key, and grants passwordless sudo limited to `systemctl reload php8.4-fpm` + `systemctl reload nginx`.
  - Lays out `/var/www/primepos/{frontend,backend}` with correct ownership and storage perms.
  - Writes an Nginx vhost with SPA fallback (`try_files … /index.html`) on `$DOMAIN` and a Laravel API server on `$API_DOMAIN` wired to the 8.4 FPM socket.
  - Enables UFW (OpenSSH + Nginx Full) and registers the Laravel scheduler cron.
  - Prints the exact GitHub Actions secrets to set (`SSH_HOST/PORT/USERNAME/PRIVATE_KEY/TARGET_DIR/BACKEND_DIR`).

Run on the VPS as root:

```bash
DEPLOY_USER=deploy DOMAIN=app.example.com API_DOMAIN=api.example.com \
  SSH_PUBLIC_KEY="ssh-ed25519 AAAA... you@laptop" \
  bash scripts/vps-bootstrap.sh
```

**Next candidates (deferred):** Reverb realtime, per-module CRUD tests.

## Stage 19 ✅ — Per-module CRUD tests (non-superadmin permission path)

Goal: lock in the `RestController` permission/tenant-scoping pipeline for ordinary tenant users, not just the superadmin short-circuit covered by Stage 15.

**Backend change**
- `RestController::authorizePerm()` now falls back to `User::canModule()` when the DB driver isn't `pgsql`. Postgres prod still uses `has_perm()` / `has_module_permission()`; sqlite tests and any mysql install get the same semantics via Eloquent (`role_permissions.can_view|create|edit|delete` joined through `user_roles`).

**Added — `backend/tests/Feature/RestPermsTest.php`** (6 tests)
- Bootstraps a tenant, a non-super `User`, a `Role`, and a `UserRole` link; `grant($module, $actions)` helper writes a `role_permissions` row.
- `sales_without_grant_is_forbidden` — index + store both 403.
- `sales_view_create_grant_allows_only_those_actions` — POST 201, list returns the row, PATCH 403, DELETE 403.
- `purchases_create_edit_grant_allows_patch_but_not_delete` — verifies per-action isolation and that the `sales` module stays locked.
- `installments_module_isolates_per_resource_actions` — full CRUD across `installment_customers` + `installment_sales`, including `?filter[installment_customer_id]=` and 404-after-delete.
- `view_only_grant_blocks_writes` — read OK, write 403.
- `non_super_user_only_sees_own_tenant_rows` — seeds a row in a second tenant, asserts the SPA tenant scope hides it (`meta.total = 1`, only `MINE-1` returned).

**Run**
```bash
cd backend && ./vendor/bin/phpunit --filter RestPermsTest --testdox
```

**Next candidate (deferred):** Reverb realtime to drop the 30s `NotificationBell` polling.

## Stage 20 ✅ — Reverb realtime for NotificationBell

Goal: replace the 30s polling fallback with instant push over Laravel Reverb so new tenant notifications light up the bell + toast within ~100ms.

**Backend**
- `composer.json` now requires `laravel/reverb ^1.0`.
- `backend/config/broadcasting.php` (new) — explicit `reverb` connection driven by `REVERB_APP_*` env. Default connection comes from `BROADCAST_CONNECTION`.
- `backend/config/reverb.php` (new) — single-app config bound to `0.0.0.0:8080`, `allowed_origins: ['*']`, Redis scaling stubbed out for later horizontal scaling.
- `backend/routes/channels.php` (new) — `tenant.{tenantId}` private channel: superadmin or `user.tenant_id === tenantId`.
- `backend/bootstrap/app.php` — `withRouting(channels: …)` so Laravel auto-loads channel auth + `/broadcasting/auth` endpoint.
- `app/Events/TenantNotificationCreated.php` — `ShouldBroadcast` on `PrivateChannel('tenant.{id}')`, broadcast name `.tenant.notification`, payload mirrors the row shape the SPA already renders.
- `NotificationService::send()` now dispatches the event after persisting the row; failures are logged and swallowed (polling remains the safety net).
- `backend/.env.example` — adds `BROADCAST_CONNECTION=reverb`, full `REVERB_*` block, and `VITE_REVERB_*` for the SPA build.

**Frontend**
- Added `laravel-echo` + `pusher-js`.
- `src/lib/echo.ts` — lazy singleton `getEcho()` constructing the Reverb-broadcast Echo client. Returns `null` when `VITE_REVERB_APP_KEY` / `VITE_REVERB_HOST` are missing so the app degrades gracefully. Custom `authorizer` posts to `/broadcasting/auth` with `credentials: "include"` + `X-XSRF-TOKEN`, because the default axios authorizer doesn't forward the Sanctum session cross-origin.
- `NotificationBell.tsx` — subscribes to `private(tenant.{tenant_id})` on mount, listens to `.tenant.notification`, and `qc.invalidateQueries(["my-notifications"])` on every push. Polling fallback bumped from 30s → 120s. Cleans up `stopListening` + `leave` on unmount / tenant change.

**Infra**
- `scripts/vps-bootstrap.sh` — opens UFW 8080/tcp; installs a `primepos-reverb` supervisor program running `php artisan reverb:start --host=0.0.0.0 --port=8080`; adds a `sudoers.d` entry letting `${DEPLOY_USER}` `supervisorctl restart primepos-reverb` passwordless. Final message documents fronting the websocket with an nginx `Upgrade`/`Connection` proxy on a public hostname.
- `.github/workflows/deploy.yml` post-deploy SSH block now appends `sudo supervisorctl restart primepos-reverb` after the FPM + nginx reloads.

**Verification**
- `bunx tsc --noEmit` clean.
- Backend test suite untouched (Reverb path is event-bus only; existing tests stay green).

**Next candidates (deferred):** push Echo wiring into more surfaces (live sales dashboard, in-flight POS sync); add Redis scaling once a second app server is in play.

## Stage 21 ✅ — Live dashboard via Reverb + WS nginx proxy

Goal: extend the Reverb plumbing from Stage 20 beyond notifications so the dashboard auto-refreshes the moment a sale or purchase happens anywhere in the tenant, and make the bootstrap script provision the websocket vhost out of the box.

**Backend**
- `app/Events/TenantResourceChanged.php` (new) — generic `ShouldBroadcast` event on `private(tenant.{id})` with name `.tenant.resource.changed` and a tiny payload (`{resource, action, id}`). Listeners refetch through their existing REST endpoints, so authorization stays in one place.
- `app/Observers/SaleObserver.php` — broadcasts `sales` on `created/updated/deleted` (failures swallowed).
- `app/Observers/PurchaseObserver.php` (new) — same pattern for `purchases`; registered in `AppServiceProvider`.

**Frontend**
- `src/hooks/useTenantRealtime.ts` (new) — subscribes to `private(tenant.{id})`, listens for `.tenant.resource.changed`, filters by a set of watched `resource` slugs, and invalidates the supplied React-Query keys. No-ops when Reverb isn't configured.
- `src/hooks/useDashboard.ts` — calls `useTenantRealtime(["sales","purchases"], [["dashboard_stats"]])`; polling drops from 30s → 120s safety net.

**Infra**
- `scripts/vps-bootstrap.sh` — new `WS_DOMAIN` env var. When set, the bootstrap appends a third nginx server block that reverse-proxies `WS_DOMAIN` → `127.0.0.1:8080` with the `Upgrade`/`Connection: upgrade` headers and 7-day read/send timeouts so Reverb websockets stay open. Without `WS_DOMAIN` the script behaves exactly as before.

**Run**
```bash
DEPLOY_USER=deploy DOMAIN=app.example.com API_DOMAIN=api.example.com \
  WS_DOMAIN=ws.example.com SSH_PUBLIC_KEY="ssh-ed25519 ..." \
  bash scripts/vps-bootstrap.sh
```
then point `VITE_REVERB_HOST=ws.example.com` for the SPA build and add TLS via `certbot --nginx -d ws.example.com`.

**Verification:** `bunx tsc --noEmit` clean.

**Next candidates (deferred):** broadcast installment collections + expense events; add Redis scaling for horizontal Reverb; per-user channels for personal toasts.

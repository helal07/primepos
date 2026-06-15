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

### Substage 9e — Accounting & Expenses
Hooks: `useAccounting`, `useExpenses`.
Tables: `accounts`, `transactions`, `journal_entries`, `journal_entry_lines`, `expenses`, `expense_categories`.

### Substage 9f — Installments
Hooks: `useInstallments`.
Tables: `installment_customers`, `installment_sales`, `installment_schedules`, `installment_collections`.

### Substage 9g — HRM
Hooks: `useHRM`.
Tables: `employees`, `attendance`, `leave_requests`, `payroll`.

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

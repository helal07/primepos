# PostgreSQL → MySQL 8.4 Column Mapping

Stage 2-এ প্রতিটা table-এর জন্য row যোগ করা হবে। এটা reference document।

## Type Mapping

| PostgreSQL | MySQL 8.4 | Laravel migration | Notes |
|---|---|---|---|
| `uuid` | `CHAR(36)` | `$table->uuid('id')->primary()` | Model-এ `use HasUuids;` (Laravel 10+) |
| `gen_random_uuid()` default | — | `HasUuids` trait auto-generates | existing UUIDs preserve-able via direct INSERT |
| `timestamptz` | `TIMESTAMP` | `$table->timestamp('col')` | App TZ = `Asia/Dhaka` |
| `timestamp` | `TIMESTAMP` | same | |
| `date` | `DATE` | `$table->date(...)` | |
| `numeric` (money) | `DECIMAL(12,2)` | `$table->decimal('amount', 12, 2)` | |
| `numeric` (qty) | `DECIMAL(12,3)` | `$table->decimal('qty', 12, 3)` | |
| `numeric` (rate %) | `DECIMAL(10,4)` | `$table->decimal('rate', 10, 4)` | |
| `integer` / `bigint` | `INT` / `BIGINT` | default | |
| `boolean` | `TINYINT(1)` | `$table->boolean(...)` | |
| `text` | `TEXT` / `LONGTEXT` | `$table->text(...)` | |
| `varchar(n)` | `VARCHAR(n)` | `$table->string('col', n)` | |
| `jsonb` | `JSON` | `$table->json(...)` | |
| `text[]` | `JSON` | `$table->json(...)` cast `'array'` | e.g. `enabled_modules` |
| `enum` | `ENUM(...)` or `VARCHAR` + CHECK | prefer string + validation | |

## RLS / Policy Replacement

| Postgres RLS pattern | Laravel equivalent |
|---|---|
| `tenant_id = get_user_tenant_id(auth.uid())` | `BelongsToTenant` trait → global scope |
| `is_superadmin(auth.uid())` | `User::isSuperadmin()` + Gate::before |
| `has_perm(auth.uid(), 'x.y')` | `$user->hasPerm('x.y')` + Policy method |
| `tenant_has_module(...)` | `tenant.module:hrm` middleware |
| Storage policy | `FileAccessPolicy` + signed URL via `Storage::temporaryUrl()` |

## Tables (Stage 2-এ row-by-row পূর্ণ হবে)

### 1. Framework
- `users` ← `auth.users` (id CHAR(36), email, phone, password, email_verified_at, …)
- `personal_access_tokens` (Sanctum default)
- `password_reset_tokens`, `sessions`, `cache`, `jobs`, `failed_jobs`

### 2. SaaS Core
- `saas_packages` `tenants` `profiles` `roles` `permission_catalog`
- `role_permissions` `role_permission_grants` `user_roles`

### 3. Master Data
- `warehouses` `brands` `categories` `units` `variations`
- `selling_price_groups` `suppliers` `customer_groups` `customers`

### 4. Inventory
- `products` `product_variations` `product_group_prices`
- `warehouse_stock` `stock_adjustments` `stock_transfers`

### 5. Purchases
- `purchase_orders` `purchase_order_items`
- `purchases` `purchase_items` `purchase_payments`

### 6. Sales
- `sales` `sale_items` `sale_payments`
- `shipments` `shipment_status_history` `courier_credentials`

### 7. Exchange
- `exchange_purchases`

### 8. Installment
- `installment_customers` `installment_sales`
- `installment_schedules` `installment_collections`

### 9. HRM
- `employees` `attendance` `leave_requests` `payroll`

### 10. Accounting
- `accounts` `journal_entries` `journal_entry_lines` `transactions`
- `expense_categories` `expenses` `expense_payments`

### 11. Warranty
- `warranties` `warranty_claims`

### 12. CMS / Store
- `cms_pages` `cms_media` `blog_posts` `faq_entries`
- `landing_features` `landing_reviews`
- `store_settings` `store_collections` `store_collection_products`
- `store_layout_sections` `store_orders` `store_order_items`
- `wishlist_items` `newsletter_subscribers`

### 13. SaaS Ops
- `business_settings` `tenant_payments` `tenant_actions_log`
- `tenant_notifications` `tenant_backups` `trial_reminders_log`
- `payment_gateways` `payment_gateway_credentials` `payment_attempts`
- `sms_plans` `sms_providers` `sms_purchases`
- `sitemap_entries` `activity_log` `sidebar_permission_audit`

## DB Function → Laravel Service Map

Plan-এর Stage 4 দেখুন (`.lovable/plan.md`)।
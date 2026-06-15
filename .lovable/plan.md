
# Prime POS → Laravel 12 + MySQL 8.4 Migration Plan

Mess Khata-র exact pipeline copy: একই repo-তে `backend/` ফোল্ডারে Laravel, Lovable React frontend touch হবে না, Coolify auto-deploy on push, MySQL 8.4 managed service, phpMyAdmin Coolify service হিসেবে।

## আকার ও স্কোপ

| উপাদান | সংখ্যা |
|---|---|
| Database tables | ~80 (Mess Khata: 33) |
| Edge functions | 24 (payments, backup, sitemap, SMS, trial-reminders, courier) |
| Storage buckets | 8 (product-images, branding, exchange-docs, installment-docs, avatars, user-documents, expense-attachments, tenant-backups) |
| DB functions/triggers | 35+ (stock delta, payment recalc, RLS helpers, tenant guards) |
| Roles/permission system | role_permissions + role_permission_grants + module gating |

আনুমানিক **~9 stage**। প্রতিটা stage user approval-এর পর pushed হবে।

## Stage 1 — Foundation (Lovable touch করবে না)

```text
prime-pos/
 ├── src/ … vite.config.ts (existing React — অপরিবর্তিত)
 └── backend/
      ├── app/{Models,Http,Enums,Services,Observers,Policies,Console,Providers}
      ├── bootstrap/, config/, routes/{api,web,console}.php
      ├── database/{migrations,seeders,factories}
      ├── public/index.php
      ├── storage/, resources/
      ├── composer.json (Laravel 12, Sanctum 4, PHP 8.3)
      ├── artisan
      ├── .env.example
      ├── Dockerfile (Nginx + PHP-FPM 8.3 + Vite build copy + mysql-client for dump)
      ├── README.md
      └── MAPPING.md
```

## Stage 2 — Schema mapping (MAPPING.md + ~80 migrations)

| PostgreSQL | MySQL 8.4 (Laravel) |
|---|---|
| `uuid` + `gen_random_uuid()` | `CHAR(36)` via `$table->uuid()` + `HasUuids` trait — **existing UUID গুলো অপরিবর্তিত import** |
| `timestamptz` | `TIMESTAMP` (app TZ `Asia/Dhaka`) |
| `numeric` | `DECIMAL(12,2)` (rates `DECIMAL(10,4)`, qty `DECIMAL(12,3)`) |
| `jsonb` | `JSON` (enabled_modules, gateway_response, branding) |
| `text[]` (enabled_modules) | `JSON` array |
| Supabase RLS policies | Eloquent global scope `BelongsToTenant` + Laravel Policies |
| Supabase auth.users | `users` table (UUID PK, bcrypt password পাস-through) |

**Migration order (FK-safe)** — main groups:

```text
1.  framework  : users, password_reset_tokens, sessions, cache, jobs, personal_access_tokens
2.  saas core  : saas_packages → tenants → profiles → roles → permission_catalog
                 → role_permissions → role_permission_grants → user_roles
3.  master     : warehouses → brands → categories → units → variations
                 → selling_price_groups → suppliers → customer_groups → customers
4.  inventory  : products → product_variations → product_group_prices
                 → warehouse_stock → stock_adjustments → stock_transfers
5.  purchases  : purchase_orders → purchase_order_items
                 → purchases → purchase_items → purchase_payments
6.  sales      : sales → sale_items → sale_payments
                 → shipments → shipment_status_history → courier_credentials
7.  exchange   : exchange_purchases
8.  installment: installment_customers → installment_sales
                 → installment_schedules → installment_collections
9.  hrm        : employees → attendance → leave_requests → payroll
10. accounting : accounts → journal_entries → journal_entry_lines
                 → transactions → expense_categories → expenses → expense_payments
11. warranty   : warranties → warranty_claims
12. cms/store  : cms_pages → cms_media → blog_posts → faq_entries → landing_features
                 → landing_reviews → store_settings → store_collections
                 → store_collection_products → store_layout_sections
                 → store_orders → store_order_items → wishlist_items
                 → newsletter_subscribers
13. saas ops   : business_settings → tenant_payments → tenant_actions_log
                 → tenant_notifications → tenant_backups → trial_reminders_log
                 → payment_gateways → payment_gateway_credentials → payment_attempts
                 → sms_plans → sms_providers → sms_purchases → sitemap_entries
                 → activity_log → sidebar_permission_audit
```

প্রতিটা tenant-scoped table-এ `tenant_id CHAR(36)` + index + `cascadeOnDelete` FK।

## Stage 3 — Auth & RLS replacement

- **Sanctum hybrid** (Mess Khata-র মতো): SPA cookie session (`/sanctum/csrf-cookie` + `/api/auth/login`) + mobile bearer token (`/api/auth/token`)। `identifier` = email/phone।
- `BelongsToTenant` trait → প্রতিটা tenant-scoped Eloquent model-এ global scope `WHERE tenant_id = auth()->user()->tenant_id`। Superadmin bypass।
- Laravel **Policies** (SalePolicy, PurchasePolicy, ProductPolicy …) Supabase RLS-এর জায়গায়।
- Permission system port:
  - `has_perm` → `User::hasPerm('sell.view_all')`
  - `has_module_permission` → `User::can("$module.$action")`
  - `tenant_has_module` → `Tenant::hasModule()` (package_id থেকে enabled_modules merge)
  - `user_sell_scope` → `User::sellScope()` ('all'|'own'|'none')
- Middleware: `role:superadmin|tenant_admin|staff`, `tenant.active` (suspended/trial-expired block), `module:hrm`।

## Stage 4 — Domain logic port (DB function/trigger → Laravel)

| Supabase function | Laravel replacement |
|---|---|
| `apply_warehouse_stock_delta` + 4 trigger | `WarehouseStockService::applyDelta()` + Model Observers |
| `recalc_sale_payment_status` + 2 trigger | `SalePaymentService::recalc()` + Observers |
| `ensure_default_warehouse` + tenant trigger | `WarehouseService::ensureDefault()` + `TenantObserver::created` |
| `enforce_serial_unique_*` (purchase ↔ exchange cross-check) | `SerialUniqueRule` validation + DB unique index |
| `sync_expense_to_transactions` trigger | `ExpenseObserver` writes to `transactions` |
| `handle_new_user` (tenant + profile + role) | `UserObserver::created` |
| `set_tenant_id` / `set_user_roles_tenant_id` / `set_rpg_tenant_id` | `BelongsToTenant` `creating` hook |
| `auto_suspend_expired_tenants` | `php artisan tenants:auto-suspend` daily |
| `activate_tenant_after_payment` | `TenantSubscriptionService::activate()` |
| `place_store_order` / `confirm_store_order` / `cancel_store_order` | `StoreOrderController` + service (DB transaction) |
| `generate_invoice_number` / `generate_expense_reference` / `generate_store_order_number` / `generate_installment_invoice` | `NumberGeneratorService` (MySQL `AUTO_INCREMENT` helper table) |
| `superadmin_delete_tenant` + `guard_tenant_delete` | `TenantDeletionService` + Policy + observer guard |
| `prevent_self_role_change` | `UserRolePolicy` |
| `is_superadmin` / `is_tenant_manager_or_above` / `get_user_tenant_id` | `User` model helpers |

## Stage 5 — Edge functions → Controllers + Scheduled commands

| Edge function | Laravel |
|---|---|
| `tenant-signup`, `admin-create-tenant`, `create-tenant-user`, `delete-tenant-user`, `reset-tenant-password` | `Api\TenantController`, `Api\TenantUserController` |
| `payment-init`, `bkash-callback`, `eps-callback`, `super-approve-payment` | `Api\PaymentController` + CSRF-exempt webhook routes |
| `tenant-backup-export/restore/snapshot` | **Stage 6-এ আলাদা — সরাসরি mysqldump** |
| `trial-reminders` | `Console\Commands\SendTrialReminders` — `daily()` |
| `send-tenant-notification` | `NotificationService` (DB + optional SMS) |
| `sitemap`, `robots` | `SitemapController` (route `/sitemap.xml`, `/robots.txt`) |
| `track-event`, `fb-pixel-proxy` | `TrackingController` (server-side pixel proxy) |

Scheduled commands `routes/console.php`-এ register, Dockerfile-এ cron daemon + `php artisan schedule:run` minutely।

## Stage 6 — Tenant Backup: সরাসরি `mysqldump` (JSON নয়)

**JSON snapshot বাদ — native MySQL dump দিয়ে export/import**, যাতে phpMyAdmin বা cli দিয়ে সরাসরি কাজ করা যায়।

### Export — `php artisan tenant:backup-export {tenant_id}`

```bash
# Service: TenantBackupService::export($tenantId)
mysqldump \
  --host=$DB_HOST --user=$DB_USERNAME --password=$DB_PASSWORD \
  --no-create-info \                      # শুধু INSERT, schema নয়
  --single-transaction --quick \
  --skip-triggers --skip-lock-tables \
  --hex-blob \
  --where="tenant_id='<uuid>'" \
  primepos \
  warehouses brands categories products product_variations \
  sales sale_items sale_payments purchases purchase_items \
  ... (list_tenant_data_tables-এর সব table) \
  | gzip > storage/app/private/backups/<tenant>/<timestamp>.sql.gz
```

- Output: একটা plain `.sql.gz` ফাইল — phpMyAdmin-এ import করা যাবে, mysql cli-তেও।
- Tenant-scoped rows-ই include হবে (`--where` clause)।
- File path `tenant_backups` table-এ row হিসেবে log (size, row counts, created_by, sha256)।
- Storage: local `storage/app/private/backups/{tenant_id}/` — UI থেকে signed URL (10 min) দিয়ে download।

### Import / Restore — `php artisan tenant:backup-restore {tenant_id} {file}`

```bash
# 1) FK off + delete current tenant rows
mysql -e "
  SET FOREIGN_KEY_CHECKS=0;
  DELETE FROM sale_items WHERE tenant_id='<uuid>';
  DELETE FROM sales WHERE tenant_id='<uuid>';
  ... (reverse FK order)
"

# 2) Import the dump
gunzip -c <file>.sql.gz | mysql -e "
  SET FOREIGN_KEY_CHECKS=0;
  SOURCE /dev/stdin;
  SET FOREIGN_KEY_CHECKS=1;
" primepos
```

- Service-এ wrap, একটা DB transaction-এর মতো atomic: ফেল করলে pre-restore snapshot থেকে rollback।
- `restore_tenant_from_backup` PG function বাদ — সব Laravel side-এ।
- Pre-restore auto-snapshot সবসময় নেওয়া হবে, যাতে accidental restore-ও undo করা যায়।

### Manual phpMyAdmin import সুবিধা

- ফাইল `.sql.gz` — phpMyAdmin "Import" tab-এ সরাসরি upload (gzip support আছে)।
- সম্পূর্ণ DB এর dump দরকার হলে: Coolify-র MySQL service থেকে native backup (Coolify built-in feature) — Lovable handle করছে না।

### Full multi-tenant backup (Superadmin)

`php artisan db:backup` → পুরো `primepos` database `mysqldump` → `storage/app/private/system-backups/`, daily schedule।

## Stage 7 — Storage migration (8 buckets → local disk)

| Bucket | Disk | Visibility |
|---|---|---|
| product-images, branding, avatars | `public` (symlink) | direct URL |
| exchange-docs, installment-docs, user-documents, expense-attachments, tenant-backups | `private` | signed URL via `Storage::temporaryUrl()` (10 min) |

`backend/scripts/download-buckets.php` — Lovable Cloud bucket → `storage/app/{public,private}/` মাইগ্রেট। Policy: `FileAccessPolicy` (tenant_id ownership check)।

## Stage 8 — Live data export (Supabase → MySQL — initial migration)

CSV import for tables (FK-safe order):

```text
1. users (auth.users → bcrypt password পাস-through, login অপরিবর্তিত)
2. saas_packages
3. tenants, profiles, roles, permission_catalog
4. role_permissions, role_permission_grants, user_roles
5. warehouses → brands → categories → units → variations → customer_groups
   → selling_price_groups → suppliers → customers
6. products → product_variations → product_group_prices → warehouse_stock
7. purchase_orders → purchase_order_items → purchases → purchase_items → purchase_payments
8. sales → sale_items → sale_payments → shipments → shipment_status_history
9. installment_customers → installment_sales → installment_schedules → installment_collections
10. exchange_purchases
11. employees → attendance → leave_requests → payroll
12. accounts → journal_entries → journal_entry_lines → transactions
    → expense_categories → expenses → expense_payments
13. warranties → warranty_claims
14. CMS + store tables
15. SaaS ops (tenant_payments, tenant_actions_log, payment_gateways, sms_*, etc.)
16. Storage buckets → `storage/app/{public,private}` via download script
```

```bash
mysql --local-infile=1 -e "
  SET FOREIGN_KEY_CHECKS=0;
  LOAD DATA LOCAL INFILE 'sales.csv' INTO TABLE sales
    FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '\"' ...;
  SET FOREIGN_KEY_CHECKS=1;"
```

UUID PK রাখায় সব FK relation অক্ষুণ্ণ। Auth users-এর জন্য আলাদা edge function script (Mess Khata pattern)।

## Stage 9 — Coolify deploy pipeline (`DEPLOY-PIPELINE-BN.md`)

```text
Lovable (develop)
   │ two-way GitHub sync
   ▼
GitHub monorepo (prime-pos)
 ├── src/, vite.config.ts …   ← React (Lovable)
 └── backend/                 ← Laravel (Lovable touch করে না)
   │ GitHub App webhook
   ▼
Coolify VPS
 ├── App: primepos     → Dockerfile → Vite build → backend/public/app + composer + migrate
 ├── DB: MySQL 8.4     (managed service, daily backup ON)
 └── phpMyAdmin        (Coolify service, internal network → MySQL, subdomain)
   ▼
https://<your-domain>  (~২ মিনিটে live, zero-downtime)
```

Dockerfile stages:
1. `bun install && bun run build` → Vite output
2. PHP-FPM 8.3 + Nginx + `mysql-client` (mysqldump-এর জন্য) + `composer install --no-dev`
3. Post-deploy: `php artisan migrate --force && php artisan optimize && php artisan storage:link`

Coolify Env:

```env
APP_ENV=production
APP_KEY=base64:<generated once>
APP_URL=https://<domain>
APP_TIMEZONE=Asia/Dhaka
DB_CONNECTION=mysql
DB_HOST=<mysql-service-name>
DB_DATABASE=primepos
DB_USERNAME=...
DB_PASSWORD=...
SESSION_DOMAIN=.<domain>
SANCTUM_STATEFUL_DOMAINS=<domain>
VITE_API_BASE_URL=https://<domain>
# Payment, SMS, AI gateway secrets …
```

## Frontend dual-mode

- `src/integrations/supabase/client.ts` Lovable preview-এ থাকবে (staging)।
- নতুন `src/integrations/api/client.ts` — Sanctum axios client (`withCredentials`, CSRF cookie flow)।
- Env switch: `VITE_BACKEND=cloud` (preview) | `VITE_BACKEND=laravel` (production)।
- React Query hooks thin wrapper-এর মাধ্যমে দুটো backend support। বড় rewrite নেই।

## কী কী আপনাকে আগে থেকে রেডি রাখতে হবে

1. GitHub account/org (Lovable Plus menu → GitHub → Connect)
2. VPS (Coolify installed, ৪ GB+ RAM)
3. Domain (e.g. primepos.yourdomain.com)
4. Payment gateway production keys (bKash, EPS, SSLCommerz)
5. SMS provider credentials
6. SMTP credentials

## ঝুঁকি ও সতর্কতা

- ~৮০ table + ৩৫+ trigger/function port বড় কাজ — stage-by-stage approval।
- MySQL-এ RLS নেই — Eloquent global scope miss করলে data leak হবে। Stage 3 coverage critical।
- Backup এখন `.sql.gz` — phpMyAdmin/mysql দিয়ে সরাসরি manageable, কিন্তু `mysqldump` binary container-এ available থাকতে হবে (Dockerfile-এ `mysql-client` add)।
- Lovable preview Supabase-এ থাকবে; preview test data ≠ production MySQL data।

## অনুমোদনের পর প্রথম যে কাজগুলো হবে

1. `backend/` skeleton + Laravel 12 + composer.json + Dockerfile (mysql-client সহ)
2. `MAPPING.md` (full 80-table mapping)
3. Stage 2-এর প্রথম batch (framework + saas core + master tables ~25 migration)

বাকি stage একে একে — প্রতি stage-এর পর আপনি review/approve করবেন।

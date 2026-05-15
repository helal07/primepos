# Tenant Data Backup & Restore

Give each tenant owner a self-service way to **download a full JSON backup of their own data**, see **automatic nightly snapshots** of their tenant, and **restore** their tenant from any backup file or snapshot — replacing all current data, with zero impact on other tenants.

## How it will work (plain English)

- A new **"Backup & Restore"** page appears in Settings, visible **only to the tenant owner**.
- The page shows:
  - A big **"Download backup now"** button → produces a single `.json` file with everything in their tenant.
  - A list of **automatic nightly snapshots** (last 2 kept), each with a Download and Restore button.
  - An **"Upload backup file to restore"** area for restoring from a previously downloaded file.
- **Restore is full-replace**: a clear confirmation dialog ("Type your tenant name to confirm") wipes all current tenant data and rebuilds it exactly from the backup. Only that tenant's data is touched — other tenants are untouched because every operation is filtered by `tenant_id`.
- **Auth users are not in scope**: staff login accounts live in `auth.users` and are global; the backup includes their `profiles` rows (so role assignments restore), but it does not delete or recreate auth accounts.
- **Uploaded files (images, docs) are  included**. 

## What gets backed up

Every tenant-scoped table in the project, including (non-exhaustive):

products, product_variations, categories, brands, units, warehouses, warehouse_stock,
customers, customer_groups, suppliers, contacts,
sales, sale_items, purchases, purchase_items, purchase_orders, sales_orders,
stock_adjustments, stock_transfers, shipments,
expenses, expense_categories, transactions, accounts, journal_entries,
installments (all related tables), exchange (all related tables),
warranties, warranty_claims,
employees, attendance, leaves, payroll,
store_orders, store_order_items, store_settings, cms_pages,
profiles (tenant staff), user_roles (tenant scoped), price_groups,
business_settings (tenant rows only).

The exact list will be derived from the live schema at build time so nothing is missed.

## Technical Details

### File format

A single JSON document:

```text
{
  "schema_version": 1,
  "exported_at": "2026-05-15T12:00:00Z",
  "tenant_id": "<uuid>",
  "tenant_snapshot": { "name": "...", "slug": "...", ... },
  "tables": {
    "products":        [ {...}, {...} ],
    "product_variations": [ ... ],
    "sales":           [ ... ],
    "sale_items":      [ ... ],
    ...
  }
}
```

Rows are stored as-is (UUIDs and FKs preserved) so restore is byte-faithful.

### New edge functions (3)

All deploy with `verify_jwt = false` and validate the caller's JWT in code via `getClaims()`, then resolve `tenant_id` via `get_user_tenant_id`, then verify the caller is the **tenant owner** (`tenants.owner_user_id = auth.uid()`).

1. `**tenant-backup-export**` (POST)
  - Uses service role key.
  - Iterates the curated table list, runs `SELECT * WHERE tenant_id = <caller tenant>` for each.
  - Streams an NDJSON-internally / JSON-output payload back as a download (`Content-Disposition: attachment`).
  - Logs the export to a new `tenant_backups` row (kind = 'manual_export').
2. `**tenant-backup-restore**` (POST, multipart with the JSON file or `{ snapshot_id }`)
  - Validates `schema_version` and that the file's `tenant_id` matches the caller's tenant; if it doesn't, **forcibly overwrite** every row's `tenant_id` to the caller's tenant before insert (defense-in-depth — a tampered file can never write into another tenant).
  - Calls a new SQL function `restore_tenant_from_backup(p_payload jsonb)` that runs in a single transaction:
  1. `SET LOCAL session_replication_role = 'replica'` to disable triggers (so `warehouse_stock`, expense→transactions sync, etc. are not double-applied — the backup already contains those rows).
  2. Delete all rows in dependency order `WHERE tenant_id = <caller>` for every tenant table.
  3. Insert rows from the payload table-by-table in parent→child order. Force `tenant_id` to caller on insert.
  4. Reset `session_replication_role`.
    gs to `tenant_backups` (kind = 'restore').
3. `**tenant-backup-snapshot**` (scheduled, no caller)
  - Cron-triggered nightly via `pg_cron` (or a Lovable scheduled function).
  - For every active tenant, generates the same JSON and uploads to a new private storage bucket `tenant-backups` at path `{tenant_id}/{YYYY-MM-DD}.json`.
  - Keeps the most recent 7 per tenant; older are deleted.
  - Records each snapshot in `tenant_backups`.

### New table

```text
tenant_backups
  id uuid pk
  tenant_id uuid (RLS-scoped)
  kind text  -- 'manual_export' | 'snapshot' | 'restore'
  storage_path text nullable  -- for snapshots
  size_bytes int nullable
  row_counts jsonb nullable
  created_by uuid nullable
  created_at timestamptz default now()
```

RLS: tenant owner can `SELECT` rows where `tenant_id = get_user_tenant_id(auth.uid())`; superadmin sees all.

### New storage bucket

`tenant-backups` (private). RLS: only edge functions (service role) write/read; tenant owners get **signed URLs** from the edge function to download their snapshot files.

### UI changes

- New page `src/pages/settings/TenantBackup.tsx` with three sections:
  1. Manual download (button + last-export timestamp)
  2. Snapshots list (7 rows, with Download / Restore actions)
  3. Restore from file (drag-drop, then confirmation modal: "Type `{tenant.name}` to confirm full replace")
- Sidebar entry under Settings, gated to owner only via `tenants.owner_user_id === auth.uid()` check (not just role).

### Safety guarantees

- Every SELECT, DELETE, INSERT in the restore SQL function is `WHERE tenant_id = <caller_tenant>` — **no cross-tenant write is possible**, even with a malicious uploaded file.
- Restore runs in **one transaction** — partial failure leaves tenant data untouched.
- A pre-restore snapshot of the current state is auto-saved to the `tenant-backups` bucket so the user can roll back if a restore was a mistake.
- Sequences (invoice numbers, etc.) are global and intentionally not reset — new invoices keep counting forward; restored historical invoice numbers stay as-is in their rows.

### Out of scope (this plan)

- Restoring uploaded files from storage buckets (product images, invoice PDFs, exchange docs). 
- Restoring `auth.users` accounts. Staff with deleted login accounts will need to be re-invited; their `profiles` and role rows still come back.
- Per-table partial restore. v1 is whole-tenant only.

## Deliverables

1. Migration: `tenant_backups` table + RLS + `restore_tenant_from_backup()` SQL function + storage bucket + bucket policies.
2. Three edge functions: `tenant-backup-export`, `tenant-backup-restore`, `tenant-backup-snapshot` (+ `pg_cron` schedule).
3. Settings UI page + sidebar entry, owner-gated.
4. Documentation note in the page explaining what is and isn't included.

After you approve, I'll implement in this order: migration → edge functions → UI → schedule the nightly snapshot job.
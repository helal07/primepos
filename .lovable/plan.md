# **Devide this in to phase to make it more acurate Make it phase by phase and complete one by one.**

# Enhanced SaaS Admin Panel — Reference Image Inspired Redesign

## What We're Building

A comprehensive redesign of the SaaS admin panel inspired by the reference image (PrimePos-style admin), making it visually distinct from the tenant-side dashboard. Key additions:

&nbsp;

1. **Tenant table with more columns** matching the reference: Name, DB, Domain, Package, Subscription Type (yearly/monthly/free trial), Company Name, Phone Number, Email, Created At, Expiry Date (color-coded badges), Last Login, Action dropdown
2. **Add Tenant dialog asks for admin username + password** — the superadmin creates the tenant's owner account (via edge function using service role key to call `auth.admin.createUser`)
3. **If any client subscribe** from online/landing page if paid then auto activate package if not paid only registration Superadmin can manualy approve or extend plan duration.
  &nbsp;
4. **Filters row** above the table: Select Domain, Select Package, Select Type dropdowns
5. **Export buttons** (Excel, CSV, PDF, Print) in the header area
6. **Records per page** selector
7. **Distinct dark-themed admin layout** differentiating SaaS admin pages from tenant pages

## Database Changes

### Migration: Add columns to `tenants` table

```sql
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS domain text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS db_name text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS company_name text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_type text NOT NULL DEFAULT 'monthly';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS last_login_at timestamptz;
```

No new tables needed.

## Edge Function: `create-tenant-user`

A new edge function that:

- Receives `{ email, password, display_name }` from the superadmin
- Uses the `SUPABASE_SERVICE_ROLE_KEY` to call `auth.admin.createUser()`
- Returns the created user's `id` (to be set as `owner_user_id`)
- Only callable by superadmins (verified via JWT check inside function)

## UI Changes

### `TenantManagement.tsx` — Full Redesign

- **Header**: "Add Client" button (green), export buttons (Excel/CSV/PDF/Print icons)
- **Filters row**: Records per page dropdown, Search input, Select Domain / Select Package / Select Type filter dropdowns
- **Table columns**: Checkbox, Name, DB, Domain (link), Package, Subscription Type, Company Name, Phone Number, Email, Created At, Expiry Date (color-coded badge — green if future, red if past), Last Login at, Action dropdown
- **Add Tenant dialog expanded**:
  - Section 1 — Admin Account: Display Name, Email, Password (creates auth user via edge function)
  - Section 2 — Business Info: Business Name, Company Name, Phone, Email, Address, 
  - Section 3 — Subscription: Package select, Subscription Type (monthly/yearly/free trial), Start Date, End Date
  - Notes textarea
  - payment 4 -- option payment method- Online/ Manual--> Amount.
- **Action menu**: Edit, Billing, Extend, Suspend/Activate, Reset Password, Delete

### `AdminDashboard.tsx` — Enhanced

- Add more summary cards: Suspended count, Monthly Revenue estimate
- Add "Payments" and "Support Tickets" navigation cards
- Style with a slightly different color scheme (darker card backgrounds) to distinguish from tenant dashboard

### `useSaasAdmin.ts` — Updates

- New `createTenantWithUser` mutation that:
  1. Calls `create-tenant-user` edge function to create auth user
  2. Uses returned `user_id` as `owner_user_id` to insert tenant record
- Add `domain`, `db_name`, `company_name`, `subscription_type` to tenant mutations

## Files Changed

- **New migration**: Add `domain`, `db_name`, `company_name`, `subscription_type`, `last_login_at` to tenants
- **New edge function**: `supabase/functions/create-tenant-user/index.ts`
- **Edit**: `src/pages/admin/TenantManagement.tsx` — full redesign with reference-image columns, filters, expanded add form
- **Edit**: `src/pages/admin/AdminDashboard.tsx` — more stats, distinct styling
- **Edit**: `src/hooks/useSaasAdmin.ts` — add `createTenantWithUser`, update tenant interfaces
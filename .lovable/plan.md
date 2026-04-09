# SaaS Admin Panel — Tenant & Package Management

## Overview

Build a Superadmin-only panel for managing tenants (businesses using the platform), subscription packages, and billing. Inspired by the Mess Khata reference images — a clean dashboard with tenant CRUD, package management, and CMS-style content editing.

## Architecture

Since this is a single-database SaaS (not multi-tenant with separate DBs), tenants are represented as rows in new tables. The Superadmin role already exists in the system.

## Database Schema (3 new tables)

### `saas_packages`

Subscription plans that tenants can subscribe to.

- `id`, `name`, `price`, `duration_days`, `max_business_location,max_invoice`, `features` (jsonb array of strings), `is_popular` (boolean), `is_active`, `sort_order`, `created_at`, `updated_at`

### `tenants`

Each business/client using the platform.

- `id`, `name`, `phone`, `email`, `address`, `owner_user_id` (references profiles.user_id), `package_id` (FK to saas_packages), `subscription_start`, `subscription_end`, `status` (active/trial/suspended/expired), `notes`, `created_at`, `updated_at`

### `tenant_actions_log`

Audit trail for superadmin actions on tenants.

- `id`, `tenant_id`, `action` (e.g. "password_reset", "package_change", "extend", "suspend"), `details` (jsonb), `performed_by`, `created_at`

RLS: All three tables restricted to superadmin only for write operations. Select on packages is public (for landing page pricing).

## New Pages

### 1. Superadmin Dashboard (`/admin`)

- Summary cards: Total Tenants (active count), Total Members (across all), Analytics link, Transactions link, CMS link
- Quick stats with icons (inspired by reference image 1)
- Only visible to Superadmin role

### 2. Tenant Management (`/admin/tenants`)

- Searchable table: Name, Phone, Members count, Package, Days Left, Status badges (active/trial/expired)
- "Incomplete registrations" section below (users registered but no tenant created)
- Row action menu (three-dot): Edit Details, Billing Settings, Extend Period, Block/Unblock, Reset Password, Delete Tenant
- Add Tenant dialog

### 3. Package Management (`/admin/packages`)

- CRUD for subscription packages
- Fields: Name, Price, Duration, Max Users,Max_business_location, Features (comma-separated), Popular toggle
- Drag-to-reorder or sort_order field
- Preview card showing how it appears on landing page

### 4. CMS for Landing Page (`/admin/cms`)

- Tab-based editor (inspired by reference images 2-3): Branding, Hero, Features & Icons, Testimonials, CTA Banner, Pricing Plans, Contact, Footer
- Each tab saves to `business_settings` with keys like `cms_hero`, `cms_features`, `cms_pricing`, etc.
- Landing page reads from these settings dynamically instead of hardcoded content

**There will be another CMS for ecommerce website building for tenant's maybe there is already have functionality.**

### 4.  Settings (`Setting`)

- Payment Getway setting like bkash, ssl Commerz, EPS to receive payment from tenant 
- Also tenant can receive payment from his customer from website (available at Tenant Dashboard Setting)  
- SMS getway setting-> Bulksms BD, MIM SMS to sending tenant sms.
-  also indevidual settings in Admin Dashboard of tenant so Tenant can send sms to his customers (greetings, Payment Reminder) .
  &nbsp;

# **5. Transation** (available SaaS Panel)

- Transation history
- manualy receive transation from tenant

&nbsp;

## Sidebar Changes

New "SaaS Admin" group at top of sidebar (only shown when user has Superadmin role):

- Dashboard → `/admin`
- Tenants → `/admin/tenants`
- Packages → `/admin/packages`
- CMS → `/admin/cms`
- `Settings`
- `Transation` 

## Route Protection

A `SuperadminRoute` wrapper component that checks `is_superadmin` role before rendering. Non-superadmins get redirected to `/dashboard`.

## Hook

New `src/hooks/useSaasAdmin.ts`:

- `useTenants()` — list all tenants with package join
- `useTenantMutations()` — CRUD, suspend, extend, password reset (via edge function for auth operations)
- `usePackages()` — list packages
- `usePackageMutations()` — CRUD for packages
- `useLandingCms()` — read/write CMS sections from business_settings

## Files

- **New migration**: Create `saas_packages`, `tenants`, `tenant_actions_log` tables with RLS
- **New**: `src/hooks/useSaasAdmin.ts`
- **New**: `src/pages/admin/AdminDashboard.tsx`
- **New**: `src/pages/admin/TenantManagement.tsx`
- **New**: `src/pages/admin/PackageManagement.tsx`
- **New**: `src/pages/admin/LandingCms.tsx`
- **New**: `src/components/admin/SuperadminRoute.tsx`
- **Edit**: `src/App.tsx` — add `/admin/*` routes
- **Edit**: `src/components/layout/AppSidebar.tsx` — add SaaS Admin group (conditional on superadmin role)
- **Edit**: `src/pages/LandingPage.tsx` — read CMS content from settings instead of hardcoded values
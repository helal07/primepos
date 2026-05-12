## Goal
Match the doctorsearch superadmin panel: dark sidebar with brand badge, collapsible nav groups, polished top bar with avatar/notifications, plus add missing admin sections relevant to an ERP/POS SaaS.

## Part 1 — Layout redesign (`/admin/*`)

Rewrite `AdminSidebar` and `AdminLayout` to mirror doctorsearch's `SuperLayout`:
- Brand block: rounded primary square + "Super Admin / Control Panel" subtitle
- "My Account" section label, rounded nav items with active highlight using `bg-sidebar-accent`
- **Collapsible groups** with chevron toggle (auto-open when child route is active)
- Top bar: hamburger (mobile), notifications bell, email + role text, avatar pill
- Mobile drawer with backdrop
- Use existing semantic tokens (`sidebar`, `sidebar-accent`, `primary`) — no hard-coded slate colors

## Part 2 — New admin pages

Relevant subset of doctorsearch admin pages adapted for this ERP (skip clinic-specific ones like Master Tests / Appointments / Commissions):

1. **Tenant Detail** (`/admin/tenants/:id`) — drill-in view: tenant info, owner, package, enabled modules, recent activity, suspend/activate
2. **Sitemap CMS** (`/admin/sitemap`) — manage public sitemap entries / robots
3. **SMS group** (collapsible in sidebar):
   - SMS Providers (`/admin/sms/providers`) — credentials per gateway
   - SMS Plans (`/admin/sms/plans`) — sellable SMS bundles
   - SMS Purchases (`/admin/sms/purchases`) — tenant purchase ledger

## Part 3 — Database

New tables (with RLS = superadmin only for write, tenant-scoped read where applicable):
- `sms_providers` (name, gateway_type, api_key, sender_id, is_active)
- `sms_plans` (name, sms_count, price, is_active)
- `sms_purchases` (tenant_id, plan_id, sms_count, amount, status, purchased_at)
- `sitemap_entries` (path, priority, changefreq, is_active)

## Technical

**Files to add**
- `src/components/admin/AdminSidebar.tsx` (rewrite)
- `src/components/admin/AdminLayout.tsx` (rewrite)
- `src/pages/admin/TenantDetail.tsx`
- `src/pages/admin/Sitemap.tsx`
- `src/pages/admin/SmsProviders.tsx`
- `src/pages/admin/SmsPlans.tsx`
- `src/pages/admin/SmsPurchases.tsx`

**Files to update**
- `src/App.tsx` — add new routes under `/admin/*`
- `src/pages/admin/TenantManagement.tsx` — make rows clickable → TenantDetail

**Migration**
- Single migration creating 4 tables + RLS policies (superadmin write, tenant own-row read for sms_purchases)

## Out of scope
Clinic-specific pages (Master Tests, Appointments, Commissions) — not applicable to POS/ERP. Real SMS sending integration (just CRUD scaffolding for now).

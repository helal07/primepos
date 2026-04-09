

# Enhanced SaaS Admin Panel — Phased Refinement

Most of this plan is already implemented. Below are the remaining refinements broken into phases.

## Phase 1: Auto-activate online subscriptions & manual approval flow

**Goal**: When a client subscribes from the landing page, auto-activate if paid; otherwise keep as "pending" for superadmin manual approval.

- Add `subscription_status` logic: new tenants from landing page default to `pending_approval` status
- Add a "Pending Approval" filter/tab in TenantManagement showing unconfirmed registrations
- Add "Approve" action in the dropdown menu that sets status to `active` and sets subscription dates
- Dashboard card for "Pending Approvals" count

**Files**: `src/pages/admin/TenantManagement.tsx`, `src/pages/admin/AdminDashboard.tsx`

---

## Phase 2: Password Reset via Edge Function

**Goal**: Make the "Reset Password" action functional (currently shows "Coming soon").

- Create new edge function `reset-tenant-password` that uses `auth.admin.updateUserById()` with service role
- Wire the TenantManagement "Reset Password" dropdown item to prompt for new password and call the function
- Add a small dialog for entering the new password

**Files**: New `supabase/functions/reset-tenant-password/index.ts`, edit `src/pages/admin/TenantManagement.tsx`

---

## Phase 3: Export functionality (Excel, CSV, PDF, Print)

**Goal**: Make the export buttons functional (currently show "Coming soon" toast).

- Implement CSV export using native JS (create blob, download)
- Implement Excel export using `xlsx` library
- Implement PDF export using `jspdf` + `jspdf-autotable`
- Implement Print using `window.print()` with a styled print view

**Files**: `src/pages/admin/TenantManagement.tsx` (add export logic), `package.json` (add xlsx, jspdf deps)

---

## Phase 4: Visual polish & dark theme consistency

**Goal**: Ensure all admin pages use the dark slate theme consistently.

- Update `TenantManagement.tsx` table to use dark backgrounds (slate-900/950 cards, slate-800 borders) matching AdminDashboard
- Update `PackageManagement.tsx`, `AdminSettings.tsx`, `AdminTransactions.tsx`, `LandingCms.tsx` with dark theme classes
- Ensure dialogs within admin pages use dark backgrounds

**Files**: All files under `src/pages/admin/`

---

## Technical Notes

- Phase 1 requires adding a "pending_approval" status option to the status Select and statusColors map
- Phase 2 edge function follows the same pattern as `create-tenant-user` (JWT verification + service role client)
- Phase 3 libraries (xlsx, jspdf) will be installed as dependencies
- No database migrations needed for any phase


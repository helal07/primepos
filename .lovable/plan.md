## Goal
Move the **Pages** (CMS Pages) menu out of the tenant app sidebar and into the **Super Admin → Landing CMS** area, since `cms_pages` is landing-site content that only platform admins should manage.

## Changes

### 1. Super Admin sidebar (`src/components/admin/AdminSidebar.tsx`)
Convert the single `Landing CMS` link into a small expandable group (same pattern as SMS Settings) with two children:
- **Sections** → `/superadmin/cms` (existing `LandingCms.tsx`)
- **Pages** → `/superadmin/cms/pages` (the existing `CmsPages` editor)

Also add the same Pages entry to `src/components/admin/AdminMobileNav.tsx`.

### 2. Routing (`src/App.tsx`)
- Add `<Route path="cms/pages" element={<CmsPages />} />` inside the existing `/superadmin` `AdminLayout` block (wrapped by `SuperadminRoute`).
- Remove the tenant route `<Route path="/cms/pages" element={<CmsPages />} />` from the `AppLayout` block.

### 3. Tenant sidebar (`src/components/layout/AppSidebar.tsx`)
Remove the `{ title: "Pages", url: "/cms/pages", icon: Globe }` entry so retailers no longer see it.

### 4. (No DB / RLS changes)
`cms_pages` table and its hooks (`useCmsPages`, `useCmsMutations`) stay as-is. The page already fetches/saves through Supabase; access will simply be gated by `SuperadminRoute` at the route level.

## Out of scope
- No schema or RLS edits in this pass. If `cms_pages` RLS currently allows tenant users to read/write, that can be tightened in a follow-up — flag it but don't change it now.
- No redesign of `LandingCms.tsx` itself.

## Files touched
- `src/App.tsx`
- `src/components/admin/AdminSidebar.tsx`
- `src/components/admin/AdminMobileNav.tsx`
- `src/components/layout/AppSidebar.tsx`
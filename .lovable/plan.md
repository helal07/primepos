## Goal

Make the public landing page fully driven by the Superadmin CMS. Add a global **Branding & Favicon** controller. Confirm CMS is Superadmin-only (no tenant CMS yet) and tighten access. Integrate the existing **Sections** + **Pages** so they actually render on the public site.

## Scope

### 1. New "Branding" tab under Superadmin → Landing CMS

Stored in `business_settings` under a new global key `cms_branding` (tenant-null row, like other `cms_*` keys today):

- Site name / brand short name
- Logo upload (upload to `branding` bucket — already exists)
- Favicon URL (32×32 / .ico / .png upload to `branding`)
- Apple touch icon URL
- Theme color
- OG default image

On save, the public `LandingPage` and `index.html` runtime will:

- Inject `<link rel="icon">`, `<link rel="apple-touch-icon">`, `<meta name="theme-color">`
- Replace the hard-coded "Prime POS" wordmark + "P" logo block in the navbar with the branding values
- Update `document.title` from branding when `cms_seo.title` is empty

### 2. Make the entire LandingPage CMS-driven

Today `LandingPage.tsx` reads only `cms_seo`, `cms_promo`, and `faq_entries`. The hero, stats, "why choose us", features list, pricing, reviews, and footer are hard-coded arrays. Move each to a CMS source so superadmin controls every word:


| Landing block                                        | Source                                                                                                               | Editor location                          |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Navbar (logo, brand, nav links, CTA labels)          | `business_settings.cms_branding` + `cms_nav`                                                                         | Branding tab + new Navigation tab        |
| Hero (badge, title, subtitle, primary/secondary CTA) | `cms_hero` (already a section pattern)                                                                               | Existing Sections tab — extend fields    |
| Stats strip (4 stat tiles)                           | `cms_stats` JSON array                                                                                               | New "Stats" editor in Sections tab       |
| Features grid (icon, title, desc × N)                | `landing_features` table (new)                                                                                       | New "Features" tab with add/edit/reorder |
| Why-choose-us (3 cards)                              | `cms_why` JSON                                                                                                       | Sections tab                             |
| Pricing                                              | Already lives in `saas_packages` — bind landing pricing to `is_active=true` packages instead of the hard-coded array | Existing Packages screen                 |
| Reviews / testimonials                               | `landing_reviews` table (new)                                                                                        | New "Reviews" tab                        |
| FAQ                                                  | `faq_entries` (already wired)                                                                                        | Existing FAQ tab                         |
| Footer (about text, links, contact, social)          | `cms_footer` JSON                                                                                                    | Sections tab                             |
| **Custom CMS Pages** (`cms_pages`)                   | Already exist but orphaned — render at `/p/:slug` and surface published pages as footer links automatically          | New public route + footer auto-list      |


### 3. Integrate Sections ↔ Pages

- Existing **Pages** editor (`/superadmin/cms/pages`) builds section arrays but no public route renders them. Add public route `/p/:slug` → `PublicCmsPage.tsx` that reads `cms_pages` by slug + `status='published'` and renders each section block.
- Auto-include published pages in the landing footer "Company / Resources" column.
- Add a "Page" picker on Sections tab so a section block can deep-link to a CMS page.

### 4. Lock CMS to superadmin only

- Confirm tenant sidebar has no CMS entry (it doesn't today). Tenant `Settings → PWA / Branding` stays separate (per-tenant white-label).
- Add a top banner inside the superadmin Landing CMS screens: "Global content — affects every visitor of the marketing site."
- RLS audit: `business_settings` rows where `tenant_id IS NULL` should be readable by anon (so landing works while logged out) but writable only by superadmin. Same for `landing_features`, `landing_reviews`, `cms_pages`. Add migration to set/verify these policies.

### 5. Favicon write-through

Two layers:

- **Static fallback** in `index.html` keeps `/favicon.ico` (current behavior).
- **Runtime override** in `LandingPage` + global `App` mount: when `cms_branding.favicon_url` is set, swap the `<link rel="icon">` href client-side (mirrors existing `DynamicManifest.tsx` pattern, but global instead of tenant-scoped).

## Technical notes

- Migration adds: `landing_features (id, icon, title, description, sort_order, is_active)`, `landing_reviews (id, name, role, rating, text, avatar_url, sort_order, is_active)`. Both are global (no `tenant_id`) with public SELECT and superadmin-only write via `is_superadmin(auth.uid())`.
- Reuse upload flow into the existing `branding` bucket for logo / favicon / OG image.
- Icon picker on Features uses a fixed allowlist of `lucide-react` names (string → component map) to keep payloads safe.
- Pricing on landing fetches `saas_packages` where `is_active = true AND show_on_landing = true` (add column).
- New superadmin tabs added to `LandingCms.tsx`: Branding, Navigation, Hero, Stats, Features, Why, Reviews, Footer, FAQ, SEO. Pages stays as its own route.
- `AdminSidebar.tsx`: rename "Sections" → "Site Content" for clarity; keep "Pages" sub-item.

## Out of scope

- Per-tenant CMS module (explicitly deferred per your message).
- Multi-language content.
- Drag-and-drop visual page builder (current section list stays).

## Deliverables

1. Migration: 2 new tables + RLS + `saas_packages.show_on_landing` column.
2. New `cms_branding` settings + Branding tab UI with file uploads.
3. New Features / Reviews / Stats / Why / Footer / Navigation editors in Landing CMS.
4. `LandingPage.tsx` rewritten to read every block from CMS with sensible fallbacks.
5. New public route `/p/:slug` rendering `cms_pages` content.
6. Footer auto-lists published CMS pages.
7. Runtime favicon + theme-color injection from `cms_branding`.
8. RLS audit migration ensuring superadmin-only writes on all CMS tables.
## Goal

Let each tenant attach a custom domain (e.g. `myshop.com`). When a visitor opens that domain, they land on the tenant's storefront. When a logged‑in tenant user opens that same domain at `/login` or `/dashboard`, they land in the admin panel — all from the same Lovable app.

The `tenants.domain` column already exists and is shown in the admin form. We just need to (a) make it work as a routing key and (b) document/automate the DNS pointing flow.

---

## How it will work

```text
visitor → myshop.com  ─┐
                       ├─► Lovable hosting (DNS A record → 185.158.133.1)
admin → myshop.com/login ─┘
                       │
                       ▼
              React app boots
                       │
       hostname === "myshop.com" ?
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
  Lookup tenant by         Path starts with /login,
  tenants.domain           /dashboard, /pos, etc.?
         │                           │
         ▼                           ▼
  Render storefront        Render admin (existing
  routes (StoreShell)      AppLayout) scoped to
  WITHOUT needing the      that tenant
  /store/:slug prefix
```

Two URL shapes will coexist:

1. **Lovable subdomain** (today): `primepos.lovable.app/store/<slug>` — unchanged.
2. **Custom domain** (new): `myshop.com/` → storefront home, `myshop.com/login` → admin login, `myshop.com/dashboard` → admin.

---

## Plan

### 1. Tenant create/edit form

- The Domain input already exists in `TenantManagement.tsx`. Add:
  - Inline help text with the exact DNS records to set:
    - `A  @     185.158.133.1`
    - `A  www   185.158.133.1`
  - A "Verify DNS" button that does a quick fetch to confirm the domain resolves to our app, and shows ✅ / ⚠️.
  - Validation: domain must be lowercase, no protocol, no trailing slash, unique across tenants.
- Mirror the same field in the tenant‑side **Store Settings** page so a tenant owner can set their own domain without superadmin help (optional toggle controlled by superadmin).

### 2. Database

- Add a unique index on `tenants.domain` (case‑insensitive) so two tenants can't claim the same domain.
- Add `domain_verified_at timestamptz` so we can show a verified badge.
- A small RPC `get_tenant_by_domain(host text)` that returns `{id, name, slug}` (SECURITY DEFINER, public read) so the storefront can resolve the host without exposing the whole tenants table.

### 3. Frontend routing (`src/App.tsx`)

- Add a `useTenantHost()` hook that:
  - Reads `window.location.hostname`.
  - Skips lookup for known hosts (`localhost`, `*.lovable.app`, `*.lovable.dev`).
  - Otherwise calls `get_tenant_by_domain(host)` and caches the result in React Query.
- Wrap `<Routes>` with that context. When a custom‑domain tenant is detected:
  - Mount the storefront at `/`, `/shop`, `/product/:slug`, `/cart`, `/checkout`, `/order/:no`, `/blog`, `/wishlist`, `/page/:slug` — same components as today, just without the `/store/:tenantSlug` prefix.
  - Keep `/login`, `/register`, `/dashboard`, `/pos`, `/sales/*`, `/ecommerce/*`, etc. pointing at the existing admin shell, but pre‑scoped to that tenant.
  - After successful login on a custom domain, redirect to `/dashboard` (admin), not the storefront.
- On the Lovable subdomain everything stays exactly as today.

### 4. Storefront components

- Replace hard‑coded `/store/${slug}/...` links with a small helper `storeUrl(path)` that returns `/store/${slug}${path}` on the Lovable subdomain and just `${path}` on a custom domain. Touches `StoreLayout`, `ProductCard`, cart, checkout, blog, wishlist, etc.

### 5. Admin login redirect

- In `Login.tsx`, after auth: if on a custom domain, route to `/dashboard`. If on the Lovable subdomain, keep current behavior.

### 6. Docs panel

- Small "Custom domain setup" card in **Store Settings** showing:
  - Required A records (`@` and `www` → `185.158.133.1`).
  - Status: Pending DNS / Verified.
  - Note: SSL is provisioned automatically by Lovable hosting once DNS resolves; allow up to 72 h.

---

## Important caveats (please read)

- **Lovable hosting only serves one custom domain per project today.** The platform's domain feature attaches `myshop.com` to the whole `primepos.lovable.app` project, not to an individual tenant. So for this feature to actually work end‑to‑end:
  - The superadmin (you) still has to add each tenant's domain inside **Project Settings → Domains** in Lovable once. The tenant just points DNS; you click "Connect domain" once per tenant.
  - Or the customer keeps Cloudflare/their own proxy in front and CNAMEs to `primepos.lovable.app`.
- The app code in this plan handles the routing/identification side. The DNS + SSL side still depends on Lovable's domain UI for each domain you want to accept.
- If you'd rather restrict this to **subdomains of one root you own** (e.g. `tenantA.yourerp.com`, `tenantB.yourerp.com`) you only have to add a single wildcard `*.yourerp.com` once and every new tenant works automatically — much less manual work. Worth considering.

---

## Open question

Do you want:

- **A.** Full custom domains per tenant (`myshop.com`) — requires you to manually attach each domain in Lovable Project Settings, or
- **B.** Wildcard subdomains under one root you own (`<tenant>.yourerp.com`) — set up once, fully automatic for new tenants, or
- **hostinger**
  Want B at hostinger
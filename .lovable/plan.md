## Ecommerce Module — Phased Build

A SalePro-style storefront is a large surface area. To keep each iteration shippable and reviewable, I'll deliver it in 5 phases. Each phase ends with a working app you can test.

Storefront URL pattern: `/store/:tenantSlug` (public, no auth required).
Admin lives under existing `/cms/*` and a new `/ecommerce/*` section in the sidebar.

---

### Phase 1 — Foundations (storefront skeleton + product catalog)

**Backend**
- Add `ecommerce` to `MODULE_CATALOG` (gated like other modules).
- Add `slug` (unique) to `tenants` so URLs resolve. Auto-generate from name on signup.
- New tables (all RLS, tenant-scoped writes, **public read** for published rows):
  - `store_settings` — per tenant: theme, logo, banner, currency, contact, social, SEO defaults, enabled (bool).
  - `store_collections` — name, slug, image, sort_order, is_featured.
  - `store_collection_products` — collection_id, product_id.
- `products` already has `show_on_website`. Add `website_description`, `gallery_urls[]`, `slug`.
- Public read RLS: anon can SELECT products where `show_on_website=true AND is_active=true` and tenant store is enabled.

**Frontend (storefront, all public routes)**
- `/store/:slug` — Home (hero, featured collections, featured products).
- `/store/:slug/shop` — Catalog with category/brand/price filter, AJAX search w/ preview, sort.
- `/store/:slug/product/:productSlug` — PDP with gallery, variant selector, Add to cart.
- `/store/:slug/collection/:collectionSlug`.
- `/store/:slug/page/:pageSlug` — renders existing CMS pages.
- Cart in localStorage; cart drawer.
- SEO: dynamic `<title>`, meta description, OG tags, JSON-LD Product schema, sitemap route.

**Admin**
- `/ecommerce/settings` — store settings form.
- `/ecommerce/collections` — CRUD collections + assign products.
- Add "Show on website" + website fields to product edit form.

---

### Phase 2 — Checkout, orders, COD

**Backend**
- `store_orders` (order_no, tenant_id, customer info, address, subtotal, shipping, total, payment_method, payment_status, fulfillment_status, notes).
- `store_order_items` (order_id, product_id, variation_id, qty, unit_price, total).
- Trigger: on order paid/confirmed → insert into existing `sales` + `sale_items` (so admin reports stay accurate) → trigger then auto-creates a `shipments` row (pending). Stock deducts via existing sale_items trigger.
- Public INSERT policy on `store_orders` for guest checkout (validates totals server-side via edge function `place-order`).

**Frontend**
- `/store/:slug/cart`, `/store/:slug/checkout` — guest or logged-in, address form, shipping method, COD option.
- `/store/:slug/orders/:orderNo` — order confirmation + tracking lookup by phone/order#.
- Admin: `/ecommerce/orders` list with filters; click → opens existing Sale + Shipment views.

---

### Phase 3 — Online payments (SSLCommerz + bKash)

- Edge functions: `store-payment-init` (creates session, redirect URL), `sslcommerz-callback`, `bkash-callback` (verify signature, mark order paid → triggers fulfillment).
- Reuses existing `payment_gateways` config rows (already in DB).
- Admin: enable/disable per tenant in `/ecommerce/settings`.

---

### Phase 4 — Couriers (Pathao + Steadfast)

- `courier_credentials` (tenant_id, provider, api_key/secret, store_id) — encrypted via secrets where possible.
- Edge function `courier-create-shipment` — called from Shipments page "Send to courier" button: creates consignment, stores tracking_no + courier label URL on `shipments` row.
- Webhook endpoints `pathao-webhook`, `steadfast-webhook` to sync status back into `shipment_status_history`.
- Admin: `/ecommerce/couriers` to configure credentials and set default courier.

---

### Phase 5 — Engagement features

- Wishlist (per customer or per session token).
- Blog: new `blog_posts` table + `/store/:slug/blog` and `/store/:slug/blog/:postSlug`.
- Newsletter signup: `newsletter_subscribers` table + simple admin export.
- Multiple themes: `default` + `fashion`. Theme = a swappable layout component set selected in store_settings.
- Drag-and-drop home layout (extends existing CMS section editor with section order/visibility).

---

### Out of scope (for now, can add later)

- Stripe/PayPal/Razorpay/Mpesa/Xendit (only BD gateways requested).
- Multi-currency.
- Advanced theme editor / true visual page builder.
- Per-tenant custom domains.

---

### Technical notes

- All public storefront routes mounted outside `<AppLayout>` (no admin sidebar). New `<StoreLayout>` per theme.
- Public Supabase reads use the existing anon key — RLS does the gating.
- Module gate: storefront only loads if tenant has `ecommerce` in `enabled_modules` AND `store_settings.enabled = true`; otherwise show a 404.
- Each phase is its own migration + PR-sized change set.

---

### What I'll do next if you approve

Implement **Phase 1** end-to-end: migration, public storefront routes, admin settings + collections page, sidebar entry. Phases 2–5 follow as separate requests so you can review and test between.

Reply "go" to start Phase 1, or tell me to adjust scope/order.
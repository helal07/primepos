# Modular Plan System + "Exchange" Module

Goal: Make the app modular. Superadmin defines which modules each plan/package includes. Tenants only see and can use the modules their plan grants. Add a new **Exchange** module for buying/selling used phones (NID, live photo, goods photos, IMEI, printable buying agreement) and a sale flow mirroring POS.

---

## 1. Module Registry (single source of truth)

Create `src/lib/modules.ts`:

```ts
export type ModuleKey =
  | "pos" | "sales" | "purchases" | "products" | "contacts"
  | "accounting" | "hrm" | "cms" | "warranty" | "installments"
  | "reports" | "exchange";

export const MODULE_CATALOG: { key: ModuleKey; label: string; description: string }[] = [
  // ...all modules including:
  { key: "exchange", label: "Exchange",
    description: "Used phone buy/sell with seller KYC, IMEI tracking, and printable agreements." },
];
```

Sidebar (`AppSidebar.tsx`) and route guards consume this list.

---

## 2. Database changes (one migration)

**a. Plan modules** — extend `saas_packages` with `enabled_modules text[]` (default core modules). Superadmin edits this in Package Management.

**b. Tenant overrides (optional)** — `tenants.enabled_modules text[]` nullable; if null, fall back to package's modules.

**c. Helper function**:
```sql
create or replace function public.tenant_has_module(_user_id uuid, _module text)
returns boolean language sql stable security definer set search_path=public as $$
  select coalesce(
    (select _module = any(t.enabled_modules)
       from tenants t join profiles p on p.tenant_id = t.id
       where p.user_id = _user_id and t.enabled_modules is not null),
    (select _module = any(pk.enabled_modules)
       from tenants t join saas_packages pk on pk.id = t.package_id
       join profiles p on p.tenant_id = t.id
       where p.user_id = _user_id),
    false
  ) or public.is_superadmin(_user_id);
$$;
```

**d. Exchange tables**:

- `exchange_purchases` — id, tenant_id, reference_no (auto), purchase_date, seller_name, seller_phone, seller_address, seller_nid_no, seller_nid_url, seller_photo_url, product_name, brand, model, imei, condition_notes, goods_photos (text[]), purchase_price, payment_method, paid_amount, status (purchased/refurbished/sold), linked_product_id (nullable, created on stock-in), linked_sale_id (nullable), created_by, created_at.
- `exchange_sales` — OR reuse existing `sales` with a flag `source='exchange'`. **Decision: reuse `sales`** by adding `sales.source text default 'regular'` and `sales.exchange_purchase_id uuid` so profit reporting stays unified.

**e. Storage bucket** `exchange-docs` (private) for NID, selfie, goods photos. RLS: tenant-scoped read/write via signed URLs.

**f. RLS** on `exchange_purchases`: tenant-scoped + module gate using `tenant_has_module(auth.uid(), 'exchange')` and `has_module_permission` for create/edit/delete.

---

## 3. Module gating (frontend)

- New hook `useEnabledModules()` — fetches the tenant's effective module list (joined from package + override) once and caches.
- `<ModuleGate module="exchange">…</ModuleGate>` wrapper used in routes; redirects to `/dashboard` with a toast if not allowed.
- `AppSidebar.tsx` filters nav items by enabled modules.

---

## 4. Exchange module UI

New routes under `/exchange`:

- `/exchange` — dashboard tiles (Today's buys, In stock, Sold, Profit).
- `/exchange/purchases` — list (filters by date, status, IMEI, seller).
- `/exchange/purchases/add` — form:
  - Seller block: name, phone, address, NID number, NID image upload, **live selfie capture** (uses `getUserMedia` → upload to bucket).
  - Goods block: brand/model, IMEI (validated), condition notes, multiple goods photo uploads.
  - Pricing: purchase price, payment method (cash/bank), paid amount.
  - Save → creates record + auto-creates a matching `products` row (serial-tracked, IMEI as serial) so it enters inventory.
- `/exchange/purchases/:id` — detail view with **Print Agreement** button.
- `/exchange/agreement/:id` — printable A4 buying-agreement page (business letterhead, seller info, device info, IMEI, price in words, signature blocks). Browser print.
- `/exchange/sell` — POS-style sale screen prefiltered to exchange-stock products. On checkout uses normal sales flow (`sales` + `sale_items`) and writes back `exchange_purchases.linked_sale_id` + status='sold'. Profit = sale price − purchase price (shown in Reports).

Reuse existing `SaleInvoice`, `PaymentDialog`, `BarcodeScanner`.

---

## 5. Superadmin Package Management

In `src/pages/admin/PackageManagement.tsx`, replace the free-form "Features" text with a **multi-select checklist** driven by `MODULE_CATALOG`, persisting to `saas_packages.enabled_modules`. Keep `features` (marketing bullets) as a separate optional text list.

In `TenantManagement.tsx`, add an optional "Override modules" multi-select per tenant (writes to `tenants.enabled_modules`).

---

## 6. Reports

Add **Exchange Profit** to Reports: per-device cost vs sale price, margin %, days in stock. Reuses existing report layout.

---

## Files to add

- `src/lib/modules.ts`
- `src/hooks/useEnabledModules.ts`
- `src/components/ModuleGate.tsx`
- `src/components/exchange/SellerCaptureForm.tsx` (selfie + NID upload)
- `src/pages/Exchange.tsx` (dashboard)
- `src/pages/ExchangePurchases.tsx`
- `src/pages/ExchangePurchaseAdd.tsx`
- `src/pages/ExchangePurchaseView.tsx`
- `src/pages/ExchangeAgreement.tsx` (printable)
- `src/pages/ExchangeSell.tsx`
- `src/pages/reports/ExchangeProfitReport.tsx`

## Files to edit

- `supabase` migration (tables, columns, function, bucket, RLS)
- `src/App.tsx` — new routes inside `<ModuleGate>`
- `src/components/layout/AppSidebar.tsx` — Exchange section, gated
- `src/pages/admin/PackageManagement.tsx` — module checklist
- `src/pages/admin/TenantManagement.tsx` — override modules
- `src/hooks/useSaasAdmin.ts` — include `enabled_modules`
- `src/pages/Reports.tsx` — link to Exchange Profit

---

## Behavior summary

- Superadmin: edit a plan → tick "Exchange" → save. Tenants on that plan instantly see Exchange in the sidebar.
- Tenant on a plan without Exchange: route returns "Module not in your plan" with upgrade hint.
- Buying a used phone: full KYC capture, auto-stock as serial-tracked product, printable agreement.
- Selling: same as POS; profit reported under Exchange Profit and aggregated in standard P&L.

Approve to implement.
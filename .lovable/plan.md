## Goal

Remove the duplicate **Payment Gateways** entry from the Superadmin sidebar and consolidate the real gateway editor into **Settings → Payment Gateways** tab. Drop the stub key/value editor currently in Settings.

## Why

Two payment-gateway editors exist:

- `src/pages/admin/PaymentGateways.tsx` — **real**, reads/writes `payment_gateways` + `payment_gateway_credentials` tables; the bKash/EPS callback edge functions consume these rows.
- `src/pages/admin/AdminSettings.tsx` → "Payment Gateways" tab — a **stub** that stores bKash/SSLCommerz/EPS into `business_settings` key/value rows that no edge function reads.

Both are reachable from the sidebar. Keep the real one.

## Changes

- **`src/pages/admin/AdminSettings.tsx`**: replace the contents of the existing `<TabsContent value="payment">` with the real gateway editor by rendering the `<PaymentGateways />` page component inside the tab (or extracting the body into a shared component and reusing it). Simpler path: import and render `<PaymentGateways />` directly inside the tab.
- **`src/components/admin/AdminSidebar.tsx`**: remove the `Payment Gateways` entry from `platformItems` (it now lives under Settings → Payment Gateways).
- **`src/App.tsx`**: keep the `payment-gateways` lazy import (still used inside Settings tab). Change the standalone route `<Route path="payment-gateways" element={<PaymentGateways />} />` to a redirect to `/superadmin/settings` so old bookmarks land on the Settings page.

## Not changing

- DB schema, `payment_gateways` / `payment_gateway_credentials` data, edge functions.
- SMS Gateways / Email Gateway / Appearance tabs in Settings.

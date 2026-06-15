# Stage 8 — Frontend Rewiring (Supabase → Laravel REST)

Goal: stop calling Supabase Storage and Supabase Edge Functions directly from the SPA. All file uploads/downloads go through Stage-7's `/api/files/*`, and all old "edge functions" go through the Laravel controllers built in Stages 5–6. Auth runs on Laravel Sanctum cookies.

## 1. New foundation files

**`src/lib/apiClient.ts`** — single Sanctum-aware HTTP client
- Reads `VITE_API_URL` (Laravel base URL, e.g. `https://api.example.com`)
- `withCredentials: true` so the `XSRF-TOKEN` + session cookie are sent
- `getCsrf()` calls `/sanctum/csrf-cookie` once per session, caches result
- Methods: `api.get/post/put/delete/upload(path, body|FormData, opts)`
- Auto-injects `X-XSRF-TOKEN` header from cookie
- Normalizes errors → throws `ApiError { status, message, errors? }`

**`src/lib/storage.ts`** — bucket helper that mirrors the old Supabase Storage surface
- `uploadFile(bucket, file, { filename? })` → `POST /api/files/upload` (multipart), returns `{ bucket, path, url }`
- `fileUrl(bucket, path)` → public buckets return `${API_URL}/storage/${bucket}/${path}`; private buckets return `${API_URL}/api/files/${bucket}/${path}` (server-signed when fetched authenticated; signature mints happen server-side via `StorageService::url()` exposed by a thin `GET /api/files/sign?bucket=&path=` endpoint added in this stage)
- `deleteFile(bucket, path)` → `DELETE /api/files/${bucket}/${path}`
- `signedUrl(bucket, path, ttlMinutes?)` → `GET /api/files/sign` (auth required, returns 10-min signed URL string)

**`src/lib/functions.ts`** — drop-in replacement for the 8 `supabase.functions.invoke(...)` call sites; each export is a typed thin wrapper:

| Old edge function           | New REST call                                       |
|-----------------------------|-----------------------------------------------------|
| `tenant-signup`             | `POST /api/tenants/signup`                          |
| `create-tenant-user`        | `POST /api/tenant-users`                            |
| `delete-tenant-user`        | `DELETE /api/tenant-users/{userId}`                 |
| `reset-tenant-password`     | `POST /api/tenant-users/{userId}/reset-password`    |
| `payment-init`              | `POST /api/payments/init`                           |
| `super-approve-payment`     | `POST /api/payments/{paymentId}/approve`            |
| `send-tenant-notification`  | `POST /api/notifications/send`                      |
| `track-event`               | `POST /api/track/event`                             |

## 2. Backend addition

Add `GET /api/files/sign?bucket=&path=` to `FileController` so the SPA can mint a 10-min signed download URL for private files without a round-trip per render (used by `InstallmentAgreement`, `MediaCapture` thumbnails, etc.). Returns `{ url, expires_at }`.

## 3. Call-site rewrites (16 files)

Each edit is a near-mechanical swap, no behavioral change.

**Storage (8 files)**
- `src/components/admin/cms/BrandingEditor.tsx` — `uploadFile("branding", file)` then store `path`/`url`
- `src/pages/Settings.tsx` — 4 branding uploads + 1 remove → `uploadFile` / `deleteFile`
- `src/pages/Profile.tsx` — avatar `uploadFile("avatars", …)`, id-proof `uploadFile("user-documents", …)`, `deleteFile`, `signedUrl`
- `src/pages/ProductAdd.tsx` — `uploadFile("product-images", …)`
- `src/pages/InstallmentCustomerAdd.tsx` — `uploadFile("installment-docs", …)`
- `src/pages/InstallmentAgreement.tsx` — `signedUrl("installment-docs", path)`
- `src/pages/settings/TenantBackup.tsx` — backup signed-download → keep using `/api/tenant-backups/{id}/download` (already signed)
- `src/components/exchange/MediaCapture.tsx` — `uploadFile` + `signedUrl("exchange-docs", path)`

**Edge functions → REST (8 files)**
- `src/lib/tracking.ts` → `trackEvent()` from `lib/functions.ts`
- `src/hooks/useRoles.ts` → `deleteTenantUser(userId)`
- `src/pages/Register.tsx` → `tenantSignup(payload)`
- `src/pages/Users.tsx` → `createTenantUser(payload)`
- `src/pages/Subscription.tsx` → `paymentInit(payload)`
- `src/pages/admin/TenantManagement.tsx` → 3× `resetTenantPassword(userId, …)` + 1× tenant-create wrapper
- `src/pages/admin/SuperPayments.tsx` → `superApprovePayment(paymentId, …)`
- `src/pages/admin/Notifications.tsx` → `sendTenantNotification(payload)`

## 4. Env

Add to `.env.example`:
```
VITE_API_URL=http://localhost:8000
```
The existing `VITE_SUPABASE_*` vars stay because Supabase Auth + Postgres are still in use during the migration; only Storage and Edge Functions are being moved off in this stage.

## 5. Out of scope (later stages)
- Replacing `supabase.from(table)` SQL queries with Laravel REST resources (Stage 9).
- Replacing `supabase.auth` with Sanctum login (Stage 10).
- Removing Supabase client entirely.

## 6. Risk + validation
- Each rewrite preserves the function's existing return shape so callers (toasts, query invalidation) don't change.
- After the patch batch, run the Vite build to surface unresolved imports / type errors.
- Manual smoke list to give the user: upload a product image, upload an avatar, generate an installment agreement link, run a tenant signup, trigger a payment init.

Reply **"go"** to apply, or tell me which mappings to adjust first (e.g. different REST paths, keep `track-event` async-only, etc.).

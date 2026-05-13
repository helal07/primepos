## Why these names appear

The "Delivered To" dropdown on the Sales Order form (`src/pages/SalesOrderAdd.tsx`, `useDeliveryPeople` hook) queries the `profiles` table with **no tenant filter**:

```ts
supabase.from("profiles").select("user_id,display_name");
```

RLS lets each user read their own profile + tenant-mates, but the bigger problem is the data itself — the `profiles` table currently contains **7 orphan rows with `tenant_id = NULL`** plus rows from other tenants. That is why names like `makesecurepro@gmail.com`, `Test Admin`, `Test User`, `Rafi`, `Ullas Ahmed` (×2) show up everywhere.

### Database audit

| display_name | tenant_id | Status |
|---|---|---|
| makesecurepro@gmail.com | NULL | orphan |
| rafi | NULL | orphan |
| Rafi | NULL | orphan |
| Test Admin | NULL | orphan |
| Test User | NULL | orphan |
| Ullas Ahmed (×2) | NULL | orphan |
| Sumon Ahmed | 29a9a663… (Sumon Telecom) | belongs to a tenant you wanted deleted but still exists |
| Al Helal, Arif, Ratul Ahmed, Ullash | valid tenants | OK |

So there are two distinct problems: (a) the dropdown query is not tenant-scoped, and (b) the table has garbage rows.

## Plan

### 1. Fix the cross-tenant leak (frontend)

In `src/pages/SalesOrderAdd.tsx`, change `useDeliveryPeople` to scope by the current user's `tenant_id`:

- Read the current user's tenant via the existing `useTenant()` / `useCurrentTenantId()` helper already used elsewhere.
- Add `.eq("tenant_id", tenantId)` and `.not("tenant_id", "is", null)` to the profiles query.
- Disable the query until `tenantId` is known.

This guarantees only members of the logged-in tenant appear in the "Delivered To" picker (and any other place that uses this hook).

### 2. Clean up garbage / orphan data (database migration)

A new migration will:

- **Delete orphan profiles** where `tenant_id IS NULL` *and* the matching `auth.users` row no longer exists, or where the user has no `user_roles` entry. (Safer than blanket-deleting all NULLs in case any belong to the SaaS super-admin.)
- **Delete orphan `user_roles`** rows whose `tenant_id` no longer exists in `tenants` and whose `user_id` no longer exists in `auth.users`.
- **Delete orphan auth users** that have no profile and no `user_roles` (optional — only if you confirm).
- **Add a NOT NULL constraint** on `profiles.tenant_id` going forward (after cleanup) so this cannot happen again. Existing profile-creation triggers already set `tenant_id`, so this is safe.
- **Add an FK** `profiles.tenant_id → tenants(id) ON DELETE CASCADE` so deleting a tenant automatically removes its profiles in the future.

### 3. Verify

- Re-query `profiles` to confirm only tenant-scoped rows remain.
- Reload `/sales/orders/add` and confirm the "Delivered To" dropdown now shows **only** users from the current tenant.

## Confirmation needed

Before I run the cleanup migration, please confirm:

1. Is `makesecurepro@gmail.com` your **SaaS super-admin** account? If yes, I will keep it (it legitimately has no tenant) and only delete the test/junk rows (`Test Admin`, `Test User`, `rafi`, `Rafi`, the two `Ullas Ahmed` duplicates).
2. Should I also delete the corresponding `auth.users` entries for the removed profiles, or just the profile rows?

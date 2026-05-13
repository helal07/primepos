# Unify Tenant Creation: Self-Register + Superadmin → same backend flow

## Problem

Two separate code paths create tenants today, and they behave differently:

| Path | Backend | Result |
|------|---------|--------|
| `/register` (self-signup) | `tenant-signup` edge function — creates auth user, then **updates** the auto-created tenant from `handle_new_user` trigger with all business fields | ✅ One clean tenant |
| Superadmin → **Add Client** | Frontend calls `create-tenant-user` (only creates auth user) → then runs `supabase.from("tenants").insert(...)` | ❌ Two tenants: the trigger's auto "trial" one (orphan) + the new one |

This is why "Ratul Mobile / active" and "Ratul Ahmed / trial" both appear in the screenshot — same owner, two rows.

## Goal

Both entry points must share **one** server-side flow modeled on `tenant-signup`, with the same activation rules:

- **Trial** → status `trial`, subscription_end = today + trial_days, instantly usable.
- **Paid** → status `pending` until Superadmin/gateway confirms payment, then `activate_tenant_after_payment` flips it to `active`.
- Auth user, profile, and tenant are always created/updated as a single atomic unit. No client-side `tenants.insert`.

## Implementation

### 1. New edge function: `admin-create-tenant`

Mirror `tenant-signup` but for Superadmin use:

- Verify caller is Superadmin (`getClaims` + `is_superadmin` RPC, same as `create-tenant-user`).
- Accept body: `{ admin_email, admin_password, admin_display_name, tenant: { name, company_name, phone, email, address, domain, package_id, subscription_type, subscription_start, subscription_end, status, notes }, choice: "trial" | "paid" | "active", payment?: { method, amount } }`.
- Validate (Zod-ish): required fields, email shape, password rules (≥8, letter+digit), name length caps — same constraints as `tenant-signup`.
- Reject if email already exists (same `listUsers` scan + 409 + `code: "email_exists"` as `tenant-signup`).
- `auth.admin.createUser({ email_confirm: true })` → trigger auto-creates a tenant.
- Look up the auto tenant by `owner_user_id`, then **update** it with the submitted fields. Compute `subscription_end` from package `duration_days` if not supplied; default `status` per `choice` (trial → `trial`, paid → `pending`, active → `active`).
- If `choice === "active"` AND a `payment` is provided, also insert a `tenant_payments` row (status `approved`, `approved_at = now()`) so audit/guard logic stays consistent.
- Update profile with `display_name`, `phone`, `address`.
- Return `{ tenant_id, user_id }`.

### 2. Refactor `tenant-signup` to share the core (lightweight)

Keep `tenant-signup` as the public, no-auth endpoint, but extract the "create user → patch auto-tenant → patch profile" block into a small local helper inside each function (duplicated code is fine — Deno edge functions don't share modules cleanly here). The shape of the patch object and validation rules must match `admin-create-tenant`.

No behavior change for `/register`.

### 3. Frontend: Superadmin **Add Client** dialog

In `src/pages/admin/TenantManagement.tsx → handleSave` (create branch):

- Replace the two-call flow (`create-tenant-user` + `tenants.insert`) with a single call to `admin-create-tenant`.
- Pass `choice` derived from the form: if `status === "trial"` → trial; if `status === "active"` AND `payment_amount` filled → active (with payment); else paid (pending).
- On success: toast, close dialog, `qc.invalidateQueries(["tenants"])`.

`create-tenant-user` stays as-is — it's still used for **staff invites** (when `tenant_id` is passed). Do not break that path.

### 4. Frontend: `/register` (`src/pages/Register.tsx`)

No functional change. Verify the "Pay now" copy already says "Activated after super admin confirms payment" (it does) and that paid signups land on `/subscription?from=register&plan=...` so they can pay via gateway, after which `activate_tenant_after_payment` (existing function) flips them to `active`. Keep as-is.

### 5. One-time DB cleanup

Remove existing orphan trial tenants created by the old Superadmin path:

```sql
-- Orphan = trial tenant whose owner has another tenant and no profile points at this one
SET LOCAL app.force_delete_tenant = 'true';
DELETE FROM public.tenants t
WHERE t.status = 'trial'
  AND EXISTS (SELECT 1 FROM public.tenants t2 WHERE t2.owner_user_id = t.owner_user_id AND t2.id <> t.id)
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.tenant_id = t.id);
```

## Resulting unified flow

```text
                 ┌────────────────────────────┐
   /register ───►│        tenant-signup       │──┐
                 └────────────────────────────┘  │
                                                 ├──► auth.createUser
   Superadmin   ┌────────────────────────────┐   │    └─► handle_new_user trigger creates tenant
   Add Client ─►│      admin-create-tenant   │──┘    └─► UPDATE that tenant with full fields
                 └────────────────────────────┘         └─► UPDATE profile (name/phone/address)
                                                       └─► trial → ready | paid → pending | active+payment → active + tenant_payments row
```

Activation rules for both paths:
- **trial** → subscription_end = today + 14d, status `trial`.
- **paid** → status `pending`, awaits gateway callback or Superadmin approval (existing `activate_tenant_after_payment` RPC).
- **active (Superadmin manual entry)** → set `active` only when payment record is captured at creation time.

## Out of scope

- No schema changes (existing `tenants`, `tenant_payments`, `handle_new_user`, `activate_tenant_after_payment`, `guard_tenant_delete` cover everything).
- No RLS edits.
- No UI redesign of the Add Client dialog beyond wiring it to the new endpoint.
- No change to the staff-invite branch of `create-tenant-user`.

## Files touched

- **new** `supabase/functions/admin-create-tenant/index.ts`
- `src/pages/admin/TenantManagement.tsx` (simplify create branch only)
- **new** migration: cleanup orphan trial tenants

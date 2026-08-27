# Mandatory NID/Phone + Cross-Tenant Installment Risk Check

## 1. Required fields

**Customer (normal)** — `src/pages/CustomerAdd.tsx`
- Phone becomes mandatory: label gets the required marker, Submit stays disabled until a valid phone is entered, and an inline error shows for empty/invalid input (digits, 6-20 chars).

**Installment customer** — `src/pages/InstallmentCustomerAdd.tsx`
- Add a new "NID Number" input (stored in the existing `installment_customers.nid` column) and make it mandatory, alongside the already-required customer selection.
- Guarantor NID number field added as optional (column `guarantor_nid` already exists).
- Server side: NID required and digits-only validated when creating/updating an installment customer.

## 2. Cross-tenant installment risk popup

When the tenant enters an NID while registering an installment customer (and again when starting an installment sale for that customer), the system checks the same NID across **all** tenants and warns if outstanding installment dues exist elsewhere.

Flow:
```text
NID entered (blur / on submit)  ->  POST /api/installments/nid-risk-check
                                    |
                        matches installment_customers.nid in OTHER tenants
                                    |
                 sum unpaid installment dues per matching tenant
                                    |
        dues found -> risk dialog:  "Shop X: goods worth 45,000, due 18,500"
        none       -> silent, continue
```

Dialog content per shop: shop/business name, customer name on file, total financed amount, total paid, outstanding due, count of overdue installments, last payment date. Actions: "Continue anyway" and "Cancel". The warning is informational — it never blocks saving, and the decision is logged in the activity log.

Privacy: the response exposes only shop name, shop contact phone (so the tenant can call and ask about the customer's payment behavior) plus aggregated amounts — no customer phone numbers, addresses, documents, product-level detail, or other tenants' record IDs.

## 3. Technical notes

- New endpoint `POST /api/installments/nid-risk-check` in `InstallmentController` (auth + `module:installments`), validating `nid` (digits, 8-25 chars) and rate-limited to prevent NID enumeration.
- Query runs with `withoutGlobalScopes()` on `installment_customers` joined to `installment_sales`, excluding the caller's own `tenant_id`, and aggregates `installment_schedules` (due vs paid) grouped by tenant; shop name comes from `tenants.name`.
- Frontend: `useNidRiskCheck` mutation in `src/hooks/useInstallments.ts`, and a `NidRiskDialog` component under `src/components/installments/` used by the installment customer form and by `InstallmentSaleAdd.tsx`.
- No schema migration needed — `nid` and `guarantor_nid` already exist on `installment_customers`.

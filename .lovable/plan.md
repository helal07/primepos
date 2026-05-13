## Goal

1. Build a full **Expenses** module (list / add / edit / categories) that also feeds the Accounting Profit & Loss report — modeled on Ultimate POS.
2. Reorder and rename the tenant sidebar groups in the exact sequence requested.
3. Stop hiding modules the tenant hasn't purchased — instead show them in the sidebar with a 🔒 lock icon, and replace the page content with an "Upgrade your plan to access this module" screen (same pattern used in the doctorsearch reference project).

---

## 1. Expenses module

### Database (single migration)

- `expense_categories` — `tenant_id`, `name`, `parent_id` (self FK, optional sub-category), `is_active`.
- `expenses`:
  - `tenant_id`, `reference_no` (auto `EP{YY}/{seq}`), `expense_date`, `category_id`, `sub_category_id`, `location_id` (nullable, links to `warehouses`), `payment_status` (`paid` / `due` / `partial`), `tax_id` (nullable), `tax_amount`, `total_amount`, `payment_due`, `contact_id` (nullable, FK to `customers` or `suppliers` via separate column), `expense_for_user_id` (employee), `expense_note`, `recurring` (bool), `recurring_interval`, `recurring_repetitions`, `attachment_url`, `created_by`.
- `expense_payments` — installment-style payments against an expense (`expense_id`, `amount`, `paid_on`, `method`, `account_id`, `note`).
- RLS: tenant-scoped via existing `get_user_tenant_id()` + `is_superadmin()` pattern; `set_tenant_id` BEFORE INSERT trigger like other tables.
- Trigger: when an expense (or expense_payment) is created/updated/deleted, create matching rows in `transactions` against the linked `account_id` (debit Expense account, credit Cash/Bank) so the Chart of Accounts / Trial Balance / Cash Flow stay in sync.
- Add `'expenses'` to `MODULE_CATALOG` in `src/lib/modules.ts` and to `DEFAULT_MODULES`.

### Frontend pages

- `src/pages/expenses/Expenses.tsx` — filterable list (date range, category, status, location, contact) with the same toolbar treatment used on `Sales.tsx` (search, export CSV/Excel/PDF, column visibility, totals row).
- `src/pages/expenses/ExpenseAdd.tsx` — form: date, reference, category + sub-category, location, contact, expense for (employee), tax, total amount, payment status + initial payment, recurring options, note, attachment upload to a new `expense-attachments` storage bucket (private).
- `src/pages/expenses/ExpenseCategories.tsx` — list + add/edit categories (supports parent → sub-category).
- `src/hooks/useExpenses.ts` — React Query hooks: `useExpenses`, `useExpense(id)`, `useExpenseMutations`, `useExpenseCategories`, `useExpensePayments`.
- Routes added in `src/App.tsx` under `/expenses`, `/expenses/add`, `/expenses/:id/edit`, `/expenses/categories`, all wrapped in `<ModuleGate module="expenses">`.

### Profit & Loss integration

- Update `src/pages/reports/profitLossCalc.ts` to accept `expenses[]` (sum of `total_amount` grouped by paid vs due) and add **Total Expenses** + an **Expenses by Category** breakdown to Net Profit calculation.
- Update `ProfitLossReport.tsx` and `ExpenseReport.tsx` to read from the new `expenses` table instead of the placeholder data they currently use.

---

## 2. Sidebar reorder + renames

Rewrite `menuGroups` in `src/components/layout/AppSidebar.tsx` in this exact order, with the renames applied to the group `label`:


| #   | Label               | Module key     | Notes                                                       | &nbsp;      |
| --- | ------------------- | -------------- | ----------------------------------------------------------- | ----------- |
| 1   | Warehouse           | `warehouses`   | (was group 4)                                               | &nbsp;      |
| 2   | Contact             | `contacts`     | renamed from "People"                                       | &nbsp;      |
| 3   | Products            | `products`     | &nbsp;                                                      | (unchanged) |
| 4   | Purchase            | `purchases`    | (unchanged)                                                 | &nbsp;      |
| 5   | Sales               | `sales`        | (unchanged)                                                 | &nbsp;      |
| 6   | Expenses            | `expenses`     | NEW — items: List Expenses, Add Expense, Expense Categories | &nbsp;      |
| 7   | Accounts            | `accounting`   | renamed from "Finance"                                      | &nbsp;      |
| 8   | Reports             | `reports`      | (unchanged)                                                 | &nbsp;      |
| 9   | Warranty Manager    | `warranty`     | renamed from "Warranty"                                     | &nbsp;      |
| 10  | Installment Manager | `installments` | renamed from "Installment"                                  | &nbsp;      |
| 11  | HRM                 | `hrm`          | (unchanged)                                                 | &nbsp;      |
| 12  | Buy & Sale Manager  | `exchange`     | renamed from "Exchange"                                     | &nbsp;      |
| 13  | Admin               | (no module)    | (unchanged)                                                 | &nbsp;      |


The "Main / Dashboard" entry stays at the very top above the numbered list (it isn't a feature module). Move POS to remain inside the Sales group.

---

## 3. Locked-module UX (replaces current "hide if not enabled")

Currently `AppSidebar` filters out any group whose `module` is not in `enabledModules`. Change to:

- **Show all groups always.** When `group.module` is set and not in `enabledModules`, render the group label with a `Lock` icon, dim the row (`opacity-60`), and route every child item to `/locked/:module` instead of its real path. Tooltip: "Upgrade your plan to access {module}".
- Tighten `ModuleGate` (`src/components/ModuleGate.tsx`) to **redirect** to `/locked/:module` instead of rendering the inline lock card, so deep-linking a disabled route also lands on the upsell page.
- Create `src/pages/LockedModule.tsx` showing:
  - Big lock icon, module display name, current package name, and the line "You are not allowed to access this module — upgrade your plan to unlock it."
  - Primary CTA "Upgrade plan" → `/subscription`
  - Secondary CTA "Contact support".
  Mirror the visual style used in the doctorsearch reference (centered card on muted background, primary gradient button).
- Add route `/locked/:module` in `src/App.tsx` (inside `AppLayout` so the sidebar still shows).

---

## Technical notes

- All new tables: `ENABLE ROW LEVEL SECURITY` + per-action policies (`is_superadmin(auth.uid()) OR tenant_id = get_user_tenant_id(auth.uid())`).
- Use existing `update_updated_at_column` trigger pattern for `updated_at`.
- Auto-numbering: `expense_reference_seq` sequence + `generate_expense_reference()` function returning `EP{YY}/{nnnn}`.
- Storage: new public-read-restricted bucket `expense-attachments` with policies scoped by `tenant_id` folder prefix.
- `useEnabledModules` stays the source of truth for entitlement; only the consumer (sidebar + ModuleGate) changes behavior.
- No changes to the Superadmin panel.

---

## Files touched (summary)

```text
NEW   supabase/migrations/<timestamp>_expenses_module.sql
NEW   src/pages/expenses/Expenses.tsx
NEW   src/pages/expenses/ExpenseAdd.tsx
NEW   src/pages/expenses/ExpenseCategories.tsx
NEW   src/hooks/useExpenses.ts
NEW   src/pages/LockedModule.tsx
EDIT  src/lib/modules.ts                       (+ "expenses" key)
EDIT  src/components/layout/AppSidebar.tsx     (reorder + locked groups)
EDIT  src/components/ModuleGate.tsx            (redirect to /locked/:module)
EDIT  src/App.tsx                              (new routes)
EDIT  src/pages/reports/profitLossCalc.ts     (+ expenses input)
EDIT  src/pages/reports/ProfitLossReport.tsx
EDIT  src/pages/reports/ExpenseReport.tsx
```
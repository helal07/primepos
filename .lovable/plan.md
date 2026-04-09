# Tenant Isolation, Accordion Sidebar & Detailed Reports

## Three Changes

### 1. Tenant Data Isolation (Database-level)

**Problem**: All 30+ data tables have `USING condition: true` for SELECT — any authenticated user sees ALL data across all tenants. This is a critical security gap for a SaaS product.

**Solution**: Add a `tenant_id` column to every tenant-scoped table, link users to tenants via `profiles.tenant_id`, and enforce isolation through RLS policies.

**All Tables needing** `tenant_id`:  
`products`, `product_variations`, `categories`, `brands`, `units`, `sales`, `sale_items`, `customers`, `suppliers`, `purchases`, `purchase_items`, `purchase_orders`, `purchase_order_items`, `stock_adjustments`, `stock_transfers`, `employees`, `attendance`, `leave_requests`, `payroll`, `accounts`, `transactions`, `journal_entries`, `journal_entry_lines`, `warranty_claims`, `cms_pages`, `cms_media`, `business_settings`, `roles`, `role_permissions`, `user_roles`, `activity_log`, `installment_customers`, `installment_sales`, `installment_schedules`, `installment_collections`

**Database changes**:

1. Add `tenant_id UUID REFERENCES tenants(id)` to `profiles` table
2. Add `tenant_id UUID` to all 30+ data tables (nullable initially to not break existing data)
3. Create a `SECURITY DEFINER` function `get_user_tenant_id(uid)` that returns the tenant_id for a given user
4. Replace all `USING (true)` SELECT policies with `USING (tenant_id = get_user_tenant_id(auth.uid()))` — superadmins bypass with `OR is_superadmin(auth.uid())`
5. Add `WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()))` on INSERT policies
6. Auto-set `tenant_id` via trigger on insert (so app code doesn't need to change immediately)

**App code changes**:

- When creating a tenant via the admin panel, set `profiles.tenant_id` for the owner user
- No changes needed in hooks/queries — RLS handles filtering automatically

**This is a large migration and will be done in phases during implementation.**

---

### 2. Sidebar Accordion (One Group Open at a Time)

**Problem**: Multiple sidebar groups can expand simultaneously, creating inconsistent spacing.

**Solution**: Track `openGroup` state in `AppSidebar`. When a group label is clicked, close all others. Use controlled `open` prop on each `Collapsible` instead of `defaultOpen`.

**File**: `src/components/layout/AppSidebar.tsx`

- Add `const [openGroup, setOpenGroup] = useState<string | null>(activeGroupLabel)`
- Each `Collapsible` gets `open={openGroup === group.label}` and `onOpenChange`
- Add consistent `py-1` spacing between groups

---
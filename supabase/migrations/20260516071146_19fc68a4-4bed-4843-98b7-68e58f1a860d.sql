
-- ============================================================
-- EXPENSES: replace tenant-only ALL policy with per-permission policies
-- ============================================================
DROP POLICY IF EXISTS "tenant_modify_expenses" ON public.expenses;
DROP POLICY IF EXISTS "tenant_select_expenses" ON public.expenses;

CREATE POLICY "expenses_select" ON public.expenses FOR SELECT TO authenticated
USING (
  is_superadmin(auth.uid())
  OR (tenant_id = get_user_tenant_id(auth.uid())
      AND (is_tenant_manager_or_above(auth.uid())
           OR has_module_permission(auth.uid(), 'expenses', 'view')))
);

CREATE POLICY "expenses_insert" ON public.expenses FOR INSERT TO authenticated
WITH CHECK (
  (is_superadmin(auth.uid()) OR tenant_id = get_user_tenant_id(auth.uid()))
  AND (is_tenant_manager_or_above(auth.uid())
       OR has_module_permission(auth.uid(), 'expenses', 'create'))
);

CREATE POLICY "expenses_update" ON public.expenses FOR UPDATE TO authenticated
USING (
  (is_superadmin(auth.uid()) OR tenant_id = get_user_tenant_id(auth.uid()))
  AND (is_tenant_manager_or_above(auth.uid())
       OR has_module_permission(auth.uid(), 'expenses', 'edit'))
)
WITH CHECK (
  (is_superadmin(auth.uid()) OR tenant_id = get_user_tenant_id(auth.uid()))
  AND (is_tenant_manager_or_above(auth.uid())
       OR has_module_permission(auth.uid(), 'expenses', 'edit'))
);

CREATE POLICY "expenses_delete" ON public.expenses FOR DELETE TO authenticated
USING (
  (is_superadmin(auth.uid()) OR tenant_id = get_user_tenant_id(auth.uid()))
  AND (is_tenant_manager_or_above(auth.uid())
       OR has_module_permission(auth.uid(), 'expenses', 'delete'))
);

-- ============================================================
-- EXPENSE CATEGORIES
-- ============================================================
DROP POLICY IF EXISTS "tenant_modify_expense_categories" ON public.expense_categories;
DROP POLICY IF EXISTS "tenant_select_expense_categories" ON public.expense_categories;

CREATE POLICY "expense_categories_select" ON public.expense_categories FOR SELECT TO authenticated
USING (
  is_superadmin(auth.uid())
  OR (tenant_id = get_user_tenant_id(auth.uid())
      AND (is_tenant_manager_or_above(auth.uid())
           OR has_module_permission(auth.uid(), 'expenses', 'view')))
);

CREATE POLICY "expense_categories_modify" ON public.expense_categories FOR ALL TO authenticated
USING (
  (is_superadmin(auth.uid()) OR tenant_id = get_user_tenant_id(auth.uid()))
  AND (is_tenant_manager_or_above(auth.uid())
       OR has_module_permission(auth.uid(), 'expenses', 'edit'))
)
WITH CHECK (
  (is_superadmin(auth.uid()) OR tenant_id = get_user_tenant_id(auth.uid()))
  AND (is_tenant_manager_or_above(auth.uid())
       OR has_module_permission(auth.uid(), 'expenses', 'edit'))
);

-- ============================================================
-- CUSTOMERS: use correct permission keys
-- ============================================================
DROP POLICY IF EXISTS "Managers can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Managers can update customers" ON public.customers;
DROP POLICY IF EXISTS "Managers can delete customers" ON public.customers;

CREATE POLICY "customers_insert" ON public.customers FOR INSERT TO authenticated
WITH CHECK (
  is_tenant_manager_or_above(auth.uid())
  OR has_module_permission(auth.uid(), 'contacts', 'create')
);
CREATE POLICY "customers_update" ON public.customers FOR UPDATE TO authenticated
USING (
  is_tenant_manager_or_above(auth.uid())
  OR has_module_permission(auth.uid(), 'contacts', 'edit')
);
CREATE POLICY "customers_delete" ON public.customers FOR DELETE TO authenticated
USING (
  is_tenant_manager_or_above(auth.uid())
  OR has_module_permission(auth.uid(), 'contacts', 'delete')
);

-- ============================================================
-- SUPPLIERS
-- ============================================================
DROP POLICY IF EXISTS "Managers can insert suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Managers can update suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Managers can delete suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON public.suppliers;

CREATE POLICY "suppliers_insert" ON public.suppliers FOR INSERT TO authenticated
WITH CHECK (
  is_tenant_manager_or_above(auth.uid())
  OR has_module_permission(auth.uid(), 'contacts', 'create')
);
CREATE POLICY "suppliers_update" ON public.suppliers FOR UPDATE TO authenticated
USING (
  is_tenant_manager_or_above(auth.uid())
  OR has_module_permission(auth.uid(), 'contacts', 'edit')
);
CREATE POLICY "suppliers_delete" ON public.suppliers FOR DELETE TO authenticated
USING (
  is_tenant_manager_or_above(auth.uid())
  OR has_module_permission(auth.uid(), 'contacts', 'delete')
);

-- ============================================================
-- STOCK ADJUSTMENTS
-- ============================================================
DROP POLICY IF EXISTS "Managers can insert adjustments" ON public.stock_adjustments;

CREATE POLICY "stock_adjustments_insert" ON public.stock_adjustments FOR INSERT TO authenticated
WITH CHECK (
  is_tenant_manager_or_above(auth.uid())
  OR has_module_permission(auth.uid(), 'products', 'create')
);

-- ============================================================
-- STOCK TRANSFERS
-- ============================================================
DROP POLICY IF EXISTS "Managers can insert transfers" ON public.stock_transfers;
DROP POLICY IF EXISTS "Managers can update transfers" ON public.stock_transfers;
DROP POLICY IF EXISTS "Authenticated users can view transfers" ON public.stock_transfers;

CREATE POLICY "stock_transfers_insert" ON public.stock_transfers FOR INSERT TO authenticated
WITH CHECK (
  is_tenant_manager_or_above(auth.uid())
  OR has_module_permission(auth.uid(), 'products', 'create')
);
CREATE POLICY "stock_transfers_update" ON public.stock_transfers FOR UPDATE TO authenticated
USING (
  is_tenant_manager_or_above(auth.uid())
  OR has_module_permission(auth.uid(), 'products', 'edit')
);

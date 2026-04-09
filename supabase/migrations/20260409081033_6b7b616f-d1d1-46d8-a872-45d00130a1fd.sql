
-- Fix installment_customers update policy
DROP POLICY IF EXISTS "ic_update" ON public.installment_customers;
CREATE POLICY "ic_update" ON public.installment_customers FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

-- Fix installment_sales update policy  
DROP POLICY IF EXISTS "is_update" ON public.installment_sales;
CREATE POLICY "is_update" ON public.installment_sales FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id(auth.uid()) AND (is_tenant_manager_or_above(auth.uid()) OR has_module_permission(auth.uid(), 'installments', 'edit'))) OR is_superadmin(auth.uid()));

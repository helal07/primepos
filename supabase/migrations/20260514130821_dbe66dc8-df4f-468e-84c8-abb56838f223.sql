
-- Tighten employees SELECT: require HRM view permission within same tenant
DROP POLICY IF EXISTS tenant_isolation_select ON public.employees;
DROP POLICY IF EXISTS employees_select ON public.employees;
CREATE POLICY employees_select ON public.employees
FOR SELECT USING (
  is_superadmin(auth.uid())
  OR (
    tenant_id = get_user_tenant_id(auth.uid())
    AND has_module_permission(auth.uid(), 'hrm', 'view')
  )
);

-- Tighten installment_sales UPDATE: drop permissive duplicate
DROP POLICY IF EXISTS tenant_isolation_update ON public.installment_sales;

-- Tighten installment-docs storage INSERT
DROP POLICY IF EXISTS installment_docs_insert ON storage.objects;
CREATE POLICY installment_docs_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'installment-docs'
  AND (
    is_tenant_manager_or_above(auth.uid())
    OR has_module_permission(auth.uid(), 'installments', 'create')
  )
);

-- Also tighten installment-docs SELECT/UPDATE to require view permission
DROP POLICY IF EXISTS installment_docs_select ON storage.objects;
CREATE POLICY installment_docs_select ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'installment-docs'
  AND (
    is_tenant_manager_or_above(auth.uid())
    OR has_module_permission(auth.uid(), 'installments', 'view')
  )
);

DROP POLICY IF EXISTS installment_docs_update ON storage.objects;
CREATE POLICY installment_docs_update ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'installment-docs'
  AND (
    is_tenant_manager_or_above(auth.uid())
    OR has_module_permission(auth.uid(), 'installments', 'edit')
  )
);

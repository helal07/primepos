
-- 1. Make installment-docs bucket private
UPDATE storage.buckets SET public = false WHERE id = 'installment-docs';

-- 2. Drop existing overly permissive storage policies for installment-docs
DROP POLICY IF EXISTS "installment_docs_select" ON storage.objects;
DROP POLICY IF EXISTS "installment_docs_insert" ON storage.objects;
DROP POLICY IF EXISTS "installment_docs_update" ON storage.objects;
DROP POLICY IF EXISTS "installment_docs_delete" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view installment docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload installment docs" ON storage.objects;

-- 3. Create proper storage policies for installment-docs (authenticated only)
CREATE POLICY "installment_docs_select"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'installment-docs');

CREATE POLICY "installment_docs_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'installment-docs');

CREATE POLICY "installment_docs_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'installment-docs');

CREATE POLICY "installment_docs_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'installment-docs' AND is_tenant_manager_or_above(auth.uid()));

-- 4. Tighten installment_schedules RLS policies
DROP POLICY IF EXISTS "isch_insert" ON public.installment_schedules;
DROP POLICY IF EXISTS "isch_update" ON public.installment_schedules;
DROP POLICY IF EXISTS "isch_delete" ON public.installment_schedules;

CREATE POLICY "isch_insert" ON public.installment_schedules
FOR INSERT TO authenticated
WITH CHECK (
  is_tenant_manager_or_above(auth.uid())
  OR has_module_permission(auth.uid(), 'installments', 'create')
);

CREATE POLICY "isch_update" ON public.installment_schedules
FOR UPDATE TO authenticated
USING (
  is_tenant_manager_or_above(auth.uid())
  OR has_module_permission(auth.uid(), 'installments', 'edit')
);

CREATE POLICY "isch_delete" ON public.installment_schedules
FOR DELETE TO authenticated
USING (
  is_tenant_manager_or_above(auth.uid())
  OR has_module_permission(auth.uid(), 'installments', 'delete')
);

-- 5. Tighten installment_collections write policies
DROP POLICY IF EXISTS "icol_insert" ON public.installment_collections;
DROP POLICY IF EXISTS "icol_update" ON public.installment_collections;

CREATE POLICY "icol_insert" ON public.installment_collections
FOR INSERT TO authenticated
WITH CHECK (
  is_tenant_manager_or_above(auth.uid())
  OR has_module_permission(auth.uid(), 'installments', 'create')
);

CREATE POLICY "icol_update" ON public.installment_collections
FOR UPDATE TO authenticated
USING (
  is_tenant_manager_or_above(auth.uid())
  OR has_module_permission(auth.uid(), 'installments', 'edit')
);

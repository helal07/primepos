
-- 1) Fix FK constraints so tenant cascade can fully clean up products
ALTER TABLE public.sale_items
  DROP CONSTRAINT IF EXISTS sale_items_product_id_fkey,
  ADD CONSTRAINT sale_items_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE public.purchase_items
  DROP CONSTRAINT IF EXISTS purchase_items_product_id_fkey,
  ADD CONSTRAINT purchase_items_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE public.store_order_items
  DROP CONSTRAINT IF EXISTS store_order_items_product_id_fkey,
  ADD CONSTRAINT store_order_items_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

-- 2) Superadmin-only safe delete that wipes tenant + auth users
CREATE OR REPLACE FUNCTION public.superadmin_delete_tenant(_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_ids uuid[];
BEGIN
  IF NOT public.is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'Only superadmins can delete tenants';
  END IF;

  -- Collect every user attached to this tenant (owner + staff)
  SELECT array_agg(DISTINCT user_id) INTO v_user_ids
  FROM public.profiles
  WHERE tenant_id = _tenant_id AND user_id IS NOT NULL;

  -- Bypass guard_tenant_delete check
  PERFORM set_config('app.force_delete_tenant', 'true', true);

  -- Delete tenant — cascades all tenant data via tenant_id FKs
  DELETE FROM public.tenants WHERE id = _tenant_id;

  -- Remove auth users (this also removes their profiles via FK cascade
  -- and credentials/email since auth.users owns them)
  IF v_user_ids IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = ANY(v_user_ids);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.superadmin_delete_tenant(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.superadmin_delete_tenant(uuid) TO authenticated;

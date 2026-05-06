
-- 1. warehouses table
CREATE TABLE public.warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  name text NOT NULL,
  code text,
  address text,
  phone text,
  contact_person text,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX warehouses_one_default_per_tenant
  ON public.warehouses (tenant_id) WHERE is_default = true;

ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

CREATE POLICY warehouses_select ON public.warehouses
FOR SELECT TO authenticated
USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

CREATE POLICY warehouses_insert ON public.warehouses
FOR INSERT TO authenticated
WITH CHECK (
  is_tenant_manager_or_above(auth.uid())
  OR has_module_permission(auth.uid(), 'products', 'create')
);

CREATE POLICY warehouses_update ON public.warehouses
FOR UPDATE TO authenticated
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()))
  AND (is_tenant_manager_or_above(auth.uid())
       OR has_module_permission(auth.uid(), 'products', 'edit'))
);

CREATE POLICY warehouses_delete ON public.warehouses
FOR DELETE TO authenticated
USING (
  is_default = false
  AND (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()))
  AND (is_tenant_manager_or_above(auth.uid())
       OR has_module_permission(auth.uid(), 'products', 'delete'))
);

CREATE TRIGGER warehouses_set_tenant
BEFORE INSERT ON public.warehouses
FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER warehouses_updated_at
BEFORE UPDATE ON public.warehouses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Prevent deleting default warehouse via trigger as a safety net
CREATE OR REPLACE FUNCTION public.prevent_default_warehouse_delete()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.is_default THEN
    RAISE EXCEPTION 'Cannot delete the default warehouse';
  END IF;
  RETURN OLD;
END; $$;

CREATE TRIGGER warehouses_prevent_default_delete
BEFORE DELETE ON public.warehouses
FOR EACH ROW EXECUTE FUNCTION public.prevent_default_warehouse_delete();

-- 2. warehouse_stock table
CREATE TABLE public.warehouse_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  product_id uuid NOT NULL,
  variation_id uuid,
  quantity numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (warehouse_id, product_id, variation_id)
);

CREATE INDEX warehouse_stock_tenant_idx ON public.warehouse_stock(tenant_id);
CREATE INDEX warehouse_stock_product_idx ON public.warehouse_stock(product_id);

ALTER TABLE public.warehouse_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY ws_select ON public.warehouse_stock
FOR SELECT TO authenticated
USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

CREATE POLICY ws_insert ON public.warehouse_stock
FOR INSERT TO authenticated
WITH CHECK (
  is_tenant_manager_or_above(auth.uid())
  OR has_module_permission(auth.uid(), 'products', 'create')
);

CREATE POLICY ws_update ON public.warehouse_stock
FOR UPDATE TO authenticated
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()))
  AND (is_tenant_manager_or_above(auth.uid())
       OR has_module_permission(auth.uid(), 'products', 'edit'))
);

CREATE POLICY ws_delete ON public.warehouse_stock
FOR DELETE TO authenticated
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()))
  AND (is_tenant_manager_or_above(auth.uid())
       OR has_module_permission(auth.uid(), 'products', 'delete'))
);

CREATE TRIGGER ws_set_tenant
BEFORE INSERT ON public.warehouse_stock
FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER ws_updated_at
BEFORE UPDATE ON public.warehouse_stock
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. warehouse_id columns on transactions
ALTER TABLE public.sales ADD COLUMN warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL;
ALTER TABLE public.purchases ADD COLUMN warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL;
ALTER TABLE public.stock_adjustments ADD COLUMN warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL;
ALTER TABLE public.stock_transfers ADD COLUMN from_warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL;
ALTER TABLE public.stock_transfers ADD COLUMN to_warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL;

-- 4. Helper to ensure a default warehouse exists for a tenant
CREATE OR REPLACE FUNCTION public.ensure_default_warehouse(_tenant_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wid uuid;
BEGIN
  IF _tenant_id IS NULL THEN RETURN NULL; END IF;
  SELECT id INTO wid FROM public.warehouses
    WHERE tenant_id = _tenant_id AND is_default = true LIMIT 1;
  IF wid IS NULL THEN
    INSERT INTO public.warehouses (tenant_id, name, code, is_default, is_active)
    VALUES (_tenant_id, 'Main Warehouse', 'MAIN', true, true)
    RETURNING id INTO wid;
  END IF;
  RETURN wid;
END; $$;

-- 5. Backfill a Main Warehouse for every existing tenant
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.tenants LOOP
    PERFORM public.ensure_default_warehouse(r.id);
  END LOOP;
END $$;

-- 6. Auto-create on new tenant
CREATE OR REPLACE FUNCTION public.create_default_warehouse_for_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.ensure_default_warehouse(NEW.id);
  RETURN NEW;
END; $$;

CREATE TRIGGER tenants_create_default_warehouse
AFTER INSERT ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.create_default_warehouse_for_tenant();

-- 7. Add 'warehouses' to default enabled_modules of existing packages and tenants (append if missing)
UPDATE public.saas_packages
SET enabled_modules = array_append(enabled_modules, 'warehouses')
WHERE enabled_modules IS NOT NULL AND NOT ('warehouses' = ANY(enabled_modules));

UPDATE public.tenants
SET enabled_modules = array_append(enabled_modules, 'warehouses')
WHERE enabled_modules IS NOT NULL AND NOT ('warehouses' = ANY(enabled_modules));

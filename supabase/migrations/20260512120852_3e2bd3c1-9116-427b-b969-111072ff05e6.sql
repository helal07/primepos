
DROP TRIGGER IF EXISTS set_tenant_id_categories ON public.categories;
CREATE TRIGGER set_tenant_id_categories
BEFORE INSERT ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

DROP TRIGGER IF EXISTS set_tenant_id_brands ON public.brands;
CREATE TRIGGER set_tenant_id_brands
BEFORE INSERT ON public.brands
FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

DROP TRIGGER IF EXISTS set_tenant_id_units ON public.units;
CREATE TRIGGER set_tenant_id_units
BEFORE INSERT ON public.units
FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

-- Backfill any existing NULL tenant_id rows created by the affected user
UPDATE public.categories c
SET tenant_id = public.get_user_tenant_id(c.created_by)
WHERE c.tenant_id IS NULL AND c.created_by IS NOT NULL;

UPDATE public.brands b
SET tenant_id = public.get_user_tenant_id(b.created_by)
WHERE b.tenant_id IS NULL AND b.created_by IS NOT NULL;

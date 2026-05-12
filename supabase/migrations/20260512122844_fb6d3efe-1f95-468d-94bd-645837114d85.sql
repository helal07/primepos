
-- 1. Backfill: link every tenant owner's profile to their tenant
UPDATE public.profiles p
SET tenant_id = t.id
FROM public.tenants t
WHERE t.owner_user_id = p.user_id
  AND p.tenant_id IS DISTINCT FROM t.id;

-- 2. Trigger function: when tenant created/updated, sync owner's profile.tenant_id
CREATE OR REPLACE FUNCTION public.sync_tenant_owner_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_user_id IS NOT NULL THEN
    UPDATE public.profiles
       SET tenant_id = NEW.id, updated_at = now()
     WHERE user_id = NEW.owner_user_id
       AND (tenant_id IS DISTINCT FROM NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_tenant_owner_profile_trg ON public.tenants;
CREATE TRIGGER sync_tenant_owner_profile_trg
AFTER INSERT OR UPDATE OF owner_user_id ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.sync_tenant_owner_profile();


ALTER TABLE public.tenants ALTER COLUMN owner_user_id DROP NOT NULL;

UPDATE public.profiles p
SET tenant_id = NULL, updated_at = now()
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = p.user_id AND r.name = 'Superadmin'
);

UPDATE public.tenants t
SET owner_user_id = NULL, updated_at = now()
WHERE owner_user_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = t.owner_user_id AND r.name = 'Superadmin'
  );

CREATE OR REPLACE FUNCTION public.detach_superadmin_from_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role_name text;
BEGIN
  SELECT name INTO v_role_name FROM public.roles WHERE id = NEW.role_id;
  IF v_role_name = 'Superadmin' THEN
    UPDATE public.profiles
       SET tenant_id = NULL, updated_at = now()
     WHERE user_id = NEW.user_id;

    UPDATE public.tenants
       SET owner_user_id = NULL, updated_at = now()
     WHERE owner_user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_detach_superadmin_from_tenant ON public.user_roles;
CREATE TRIGGER trg_detach_superadmin_from_tenant
AFTER INSERT OR UPDATE OF role_id ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.detach_superadmin_from_tenant();

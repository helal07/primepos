-- Drop overly broad / duplicate policies on user_roles
DROP POLICY IF EXISTS "Managers can view all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Managers can assign roles" ON public.user_roles;
DROP POLICY IF EXISTS "Managers can update user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Managers can remove user roles" ON public.user_roles;

-- Auto-fill tenant_id on insert from the acting user's tenant (if not provided)
CREATE OR REPLACE FUNCTION public.set_user_roles_tenant_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.get_user_tenant_id(NEW.user_id);
    IF NEW.tenant_id IS NULL THEN
      NEW.tenant_id := public.get_user_tenant_id(auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_user_roles_tenant_id ON public.user_roles;
CREATE TRIGGER trg_set_user_roles_tenant_id
BEFORE INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.set_user_roles_tenant_id();

-- Tenant-scoped manager policies
CREATE POLICY "Managers assign roles in own tenant"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (
  is_superadmin(auth.uid())
  OR (
    is_tenant_manager_or_above(auth.uid())
    AND public.get_user_tenant_id(user_id) = public.get_user_tenant_id(auth.uid())
  )
);

CREATE POLICY "Managers update roles in own tenant"
ON public.user_roles FOR UPDATE TO authenticated
USING (
  is_superadmin(auth.uid())
  OR (
    is_tenant_manager_or_above(auth.uid())
    AND tenant_id = public.get_user_tenant_id(auth.uid())
  )
);

CREATE POLICY "Managers remove roles in own tenant"
ON public.user_roles FOR DELETE TO authenticated
USING (
  is_superadmin(auth.uid())
  OR (
    is_tenant_manager_or_above(auth.uid())
    AND (
      tenant_id = public.get_user_tenant_id(auth.uid())
      OR public.get_user_tenant_id(user_id) = public.get_user_tenant_id(auth.uid())
    )
  )
);

-- Backfill tenant_id on existing user_roles rows
UPDATE public.user_roles ur
SET tenant_id = p.tenant_id
FROM public.profiles p
WHERE ur.user_id = p.user_id
  AND ur.tenant_id IS NULL
  AND p.tenant_id IS NOT NULL;
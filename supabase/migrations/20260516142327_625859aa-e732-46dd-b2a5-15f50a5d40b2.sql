CREATE OR REPLACE FUNCTION public.is_tenant_manager_or_above(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = _user_id
      AND r.name IN ('Superadmin', 'Tenant Manager')
  ) OR EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.owner_user_id = _user_id
  )
$function$;
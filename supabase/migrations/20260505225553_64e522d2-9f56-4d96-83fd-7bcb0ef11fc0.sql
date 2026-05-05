CREATE OR REPLACE FUNCTION public.tenant_has_module(_user_id uuid, _module text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_superadmin(_user_id) OR EXISTS (
    SELECT 1
    FROM public.profiles p
    LEFT JOIN public.tenants t ON t.id = p.tenant_id
    LEFT JOIN public.saas_packages pk ON pk.id = t.package_id
    WHERE p.user_id = _user_id
      AND (
        (t.enabled_modules IS NOT NULL AND _module = ANY(t.enabled_modules))
        OR (t.enabled_modules IS NULL AND pk.enabled_modules IS NOT NULL AND _module = ANY(pk.enabled_modules))
        OR (t.enabled_modules IS NULL AND (pk.enabled_modules IS NULL OR pk.id IS NULL))
      )
  );
$$;

-- Also enable exchange on existing packages so tenants on default plans can use it
UPDATE public.saas_packages
SET enabled_modules = array_append(enabled_modules, 'exchange')
WHERE NOT ('exchange' = ANY(enabled_modules));
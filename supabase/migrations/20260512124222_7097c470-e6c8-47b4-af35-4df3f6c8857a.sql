
-- 1. Update handle_new_user to auto-create a tenant for every new signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _name text;
  _tenant_id uuid;
  _tm_role uuid;
BEGIN
  _name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- Create tenant for this new signup
  INSERT INTO public.tenants (name, email, owner_user_id, status, subscription_type)
  VALUES (_name, NEW.email, NEW.id, 'trial', 'monthly')
  RETURNING id INTO _tenant_id;

  -- Create profile linked to tenant
  INSERT INTO public.profiles (user_id, display_name, tenant_id)
  VALUES (NEW.id, _name, _tenant_id);

  -- Assign Tenant Manager role so owner can manage their tenant data
  SELECT id INTO _tm_role FROM public.roles WHERE name = 'Tenant Manager' LIMIT 1;
  IF _tm_role IS NULL THEN
    SELECT id INTO _tm_role FROM public.roles WHERE name = 'Staff' LIMIT 1;
  END IF;
  IF _tm_role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role_id) VALUES (NEW.id, _tm_role);
  END IF;

  RETURN NEW;
END;
$function$;

-- 2. Backfill: create tenants for existing orphan users (no tenant yet)
DO $$
DECLARE
  r RECORD;
  _tid uuid;
  _tm uuid;
BEGIN
  SELECT id INTO _tm FROM public.roles WHERE name = 'Tenant Manager' LIMIT 1;
  FOR r IN
    SELECT u.id, u.email, COALESCE(p.display_name, split_part(u.email,'@',1)) AS dname
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.user_id = u.id
    LEFT JOIN public.tenants t ON t.owner_user_id = u.id
    WHERE t.id IS NULL
      AND NOT public.is_superadmin(u.id)
  LOOP
    INSERT INTO public.tenants (name, email, owner_user_id, status, subscription_type)
    VALUES (r.dname, r.email, r.id, 'trial', 'monthly')
    RETURNING id INTO _tid;

    -- Ensure profile exists & is linked
    INSERT INTO public.profiles (user_id, display_name, tenant_id)
    VALUES (r.id, r.dname, _tid)
    ON CONFLICT (user_id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id;

    -- Assign Tenant Manager role if not already
    IF _tm IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = r.id AND role_id = _tm
    ) THEN
      INSERT INTO public.user_roles (user_id, role_id) VALUES (r.id, _tm);
    END IF;
  END LOOP;
END $$;

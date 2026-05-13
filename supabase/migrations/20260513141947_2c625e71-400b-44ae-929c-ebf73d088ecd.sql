
-- 1) Delete orphan profile rows (no tenant) for non-superadmin users,
--    plus their auth.users records and any user_roles.
DO $$
DECLARE
  v_orphan_users uuid[];
BEGIN
  SELECT array_agg(p.user_id)
    INTO v_orphan_users
  FROM public.profiles p
  WHERE p.tenant_id IS NULL
    AND NOT public.is_superadmin(p.user_id);

  IF v_orphan_users IS NOT NULL THEN
    DELETE FROM public.profiles    WHERE user_id = ANY(v_orphan_users);
    DELETE FROM public.user_roles  WHERE user_id = ANY(v_orphan_users);
    DELETE FROM auth.users         WHERE id      = ANY(v_orphan_users);
  END IF;
END $$;

-- 2) Delete profile rows whose tenant no longer exists (defensive).
DELETE FROM public.profiles p
WHERE p.tenant_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = p.tenant_id);

-- 3) Add FK profiles.tenant_id -> tenants(id) ON DELETE CASCADE
--    (drop pre-existing constraint with same target if any, then create).
DO $$
DECLARE
  v_conname text;
BEGIN
  SELECT conname INTO v_conname
  FROM pg_constraint
  WHERE conrelid = 'public.profiles'::regclass
    AND contype  = 'f'
    AND pg_get_constraintdef(oid) ILIKE '%REFERENCES tenants%';

  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', v_conname);
  END IF;
END $$;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

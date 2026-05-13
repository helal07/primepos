CREATE OR REPLACE FUNCTION public.guard_tenant_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_force text;
  v_paid_count int;
BEGIN
  BEGIN
    v_force := current_setting('app.force_delete_tenant', true);
  EXCEPTION WHEN OTHERS THEN
    v_force := NULL;
  END;

  IF v_force = 'true' THEN
    RETURN OLD;
  END IF;

  IF OLD.status = 'active' THEN
    RAISE EXCEPTION 'Cannot delete tenant "%": subscription is active. Suspend the tenant first.', OLD.name
      USING ERRCODE = 'check_violation';
  END IF;

  -- Once a tenant is suspended, Superadmin can permanently delete it.
  -- Non-suspended paid tenants still require suspension first.
  IF OLD.status IS DISTINCT FROM 'suspended' THEN
    IF OLD.subscription_end IS NOT NULL AND OLD.subscription_end > CURRENT_DATE THEN
      RAISE EXCEPTION 'Cannot delete tenant "%": subscription is paid until %. Suspend the tenant first.', OLD.name, OLD.subscription_end
        USING ERRCODE = 'check_violation';
    END IF;

    SELECT count(*) INTO v_paid_count
      FROM public.tenant_payments
     WHERE tenant_id = OLD.id
       AND status IN ('active','approved');

    IF v_paid_count > 0 THEN
      RAISE EXCEPTION 'Cannot delete tenant "%": % approved payment(s) on record. Suspend the tenant first.', OLD.name, v_paid_count
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN OLD;
END;
$$;

DO $$
DECLARE
  fk record;
BEGIN
  FOR fk IN
    SELECT
      con.conname,
      con.conrelid::regclass AS table_name
    FROM pg_constraint con
    JOIN pg_attribute att
      ON att.attrelid = con.conrelid
     AND att.attnum = ANY(con.conkey)
    WHERE con.contype = 'f'
      AND con.confrelid = 'public.tenants'::regclass
      AND att.attname = 'tenant_id'
      AND con.conrelid <> 'public.profiles'::regclass
      AND pg_get_constraintdef(con.oid) NOT ILIKE '%ON DELETE CASCADE%'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', fk.table_name, fk.conname);
    EXECUTE format(
      'ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE',
      fk.table_name,
      fk.conname
    );
  END LOOP;
END;
$$;
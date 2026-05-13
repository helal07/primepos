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
    RAISE EXCEPTION 'Cannot delete tenant "%": subscription is active. Suspend the tenant first or force-delete.', OLD.name
      USING ERRCODE = 'check_violation';
  END IF;

  IF OLD.subscription_end IS NOT NULL AND OLD.subscription_end > CURRENT_DATE THEN
    RAISE EXCEPTION 'Cannot delete tenant "%": subscription is paid until %. Force-delete to override.', OLD.name, OLD.subscription_end
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT count(*) INTO v_paid_count
    FROM public.tenant_payments
   WHERE tenant_id = OLD.id
     AND status IN ('active','approved');

  IF v_paid_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete tenant "%": % approved payment(s) on record. Force-delete to override.', OLD.name, v_paid_count
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS guard_tenant_delete_trg ON public.tenants;
CREATE TRIGGER guard_tenant_delete_trg
  BEFORE DELETE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.guard_tenant_delete();

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function to suspend any tenant whose subscription has expired
CREATE OR REPLACE FUNCTION public.auto_suspend_expired_tenants()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer := 0;
  r record;
BEGIN
  FOR r IN
    SELECT id FROM public.tenants
    WHERE status NOT IN ('suspended','cancelled')
      AND subscription_end IS NOT NULL
      AND subscription_end < CURRENT_DATE
  LOOP
    UPDATE public.tenants SET status = 'suspended', updated_at = now() WHERE id = r.id;
    INSERT INTO public.tenant_actions_log (tenant_id, action, details, performed_by)
    VALUES (r.id, 'auto_suspended', jsonb_build_object('reason','subscription_expired'), NULL);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.auto_suspend_expired_tenants() FROM public;

-- Run hourly
SELECT cron.unschedule('auto-suspend-expired-tenants')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-suspend-expired-tenants');

SELECT cron.schedule(
  'auto-suspend-expired-tenants',
  '0 * * * *',
  $$ SELECT public.auto_suspend_expired_tenants(); $$
);

-- Run once now to catch already-expired tenants
SELECT public.auto_suspend_expired_tenants();

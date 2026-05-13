-- End-to-end test: auto-suspend on expired subscription_end,
-- then reactivate and confirm status=active with subscription_end pushed to future.
--
-- Run with:  psql -v ON_ERROR_STOP=1 -f tests/e2e/tenant_suspend_reactivate.sql
--
-- The whole scenario runs inside a transaction and is rolled back at the end,
-- so it never leaves test data behind.

\set ON_ERROR_STOP on
BEGIN;
-- Bypass RLS for the duration of this test transaction (requires superuser/owner).
SET LOCAL row_security = off;

DO $$
DECLARE
  v_pkg_id uuid;
  v_tenant_id uuid;
  v_status text;
  v_end date;
  v_duration int;
  v_new_end date;
  v_owner uuid;
BEGIN
  -- 1) Pick any active package (or fall back to 30 days)
  SELECT id, COALESCE(duration_days, 30)
    INTO v_pkg_id, v_duration
  FROM public.saas_packages
  WHERE is_active = true
  ORDER BY duration_days ASC
  LIMIT 1;
  IF v_duration IS NULL THEN v_duration := 30; END IF;

  -- Need a real owner_user_id (NOT NULL). Reuse any existing superadmin.
  SELECT ur.user_id INTO v_owner
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE r.name = 'Superadmin'
  LIMIT 1;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'FAIL: no superadmin user available to own the test tenant';
  END IF;

  -- 2) Create a tenant whose subscription expired YESTERDAY
  INSERT INTO public.tenants (
    name, slug, email, status, subscription_type,
    subscription_start, subscription_end, package_id, owner_user_id
  ) VALUES (
    'E2E Test Tenant ' || gen_random_uuid()::text,
    'e2e-' || substr(md5(random()::text), 1, 10),
    'e2e-test@example.com',
    'active',
    'monthly',
    CURRENT_DATE - INTERVAL '40 days',
    CURRENT_DATE - INTERVAL '1 day',
    v_pkg_id,
    v_owner
  ) RETURNING id INTO v_tenant_id;

  RAISE NOTICE 'Created tenant % with expired subscription_end', v_tenant_id;

  -- 3) Run the cron function and assert tenant is now suspended
  PERFORM public.auto_suspend_expired_tenants();

  SELECT status, subscription_end INTO v_status, v_end
    FROM public.tenants WHERE id = v_tenant_id;

  IF v_status <> 'suspended' THEN
    RAISE EXCEPTION 'FAIL: expected status=suspended after auto-suspend, got %', v_status;
  END IF;
  RAISE NOTICE 'PASS: auto_suspend_expired_tenants() suspended the tenant (status=%)', v_status;

  -- Confirm an audit log row was written
  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_actions_log
    WHERE tenant_id = v_tenant_id AND action = 'auto_suspended'
  ) THEN
    RAISE EXCEPTION 'FAIL: no auto_suspended audit log entry';
  END IF;
  RAISE NOTICE 'PASS: auto_suspended audit log entry exists';

  -- 4) Reactivate using the same logic the UI runs (useSaasAdmin.activate):
  --    if subscription_end is in the past -> renew subscription_start=today,
  --    subscription_end=today + package.duration_days, status=active
  v_new_end := CURRENT_DATE + (v_duration || ' days')::interval;

  UPDATE public.tenants
     SET status = 'active',
         subscription_start = CURRENT_DATE,
         subscription_end   = v_new_end,
         updated_at = now()
   WHERE id = v_tenant_id;

  -- 5) Assert reactivated state
  SELECT status, subscription_end INTO v_status, v_end
    FROM public.tenants WHERE id = v_tenant_id;

  IF v_status <> 'active' THEN
    RAISE EXCEPTION 'FAIL: expected status=active after reactivation, got %', v_status;
  END IF;
  IF v_end <= CURRENT_DATE THEN
    RAISE EXCEPTION 'FAIL: expected subscription_end > today after reactivation, got %', v_end;
  END IF;
  RAISE NOTICE 'PASS: reactivation set status=% and subscription_end=% (today=%)',
    v_status, v_end, CURRENT_DATE;

  -- 6) Re-run the cron to make sure an active tenant with a future date is NOT re-suspended
  PERFORM public.auto_suspend_expired_tenants();

  SELECT status INTO v_status FROM public.tenants WHERE id = v_tenant_id;
  IF v_status <> 'active' THEN
    RAISE EXCEPTION 'FAIL: tenant got re-suspended after reactivation (status=%)', v_status;
  END IF;
  RAISE NOTICE 'PASS: reactivated tenant survives the next auto-suspend run';

  RAISE NOTICE 'ALL TESTS PASSED for tenant %', v_tenant_id;
END $$;

ROLLBACK;
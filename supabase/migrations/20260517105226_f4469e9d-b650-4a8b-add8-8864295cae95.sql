-- Fix business_settings unique constraint: it was globally unique on `key`,
-- which prevented more than one tenant from saving the same setting key
-- (e.g. "business"). Replace with per-tenant uniqueness, while keeping
-- global rows (tenant_id IS NULL) singleton-per-key.
ALTER TABLE public.business_settings DROP CONSTRAINT IF EXISTS business_settings_key_key;

CREATE UNIQUE INDEX IF NOT EXISTS business_settings_tenant_key_uniq
  ON public.business_settings (tenant_id, key)
  WHERE tenant_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS business_settings_global_key_uniq
  ON public.business_settings (key)
  WHERE tenant_id IS NULL;
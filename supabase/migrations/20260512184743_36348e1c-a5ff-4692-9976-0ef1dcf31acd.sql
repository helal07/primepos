
-- Phase 4: Courier integrations (Pathao + Steadfast)
CREATE TABLE IF NOT EXISTS public.courier_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  provider text NOT NULL CHECK (provider IN ('pathao','steadfast')),
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  -- Pathao
  pathao_base_url text,
  pathao_client_id text,
  pathao_client_secret text,
  pathao_username text,
  pathao_password text,
  pathao_store_id text,
  pathao_access_token text,
  pathao_refresh_token text,
  pathao_token_expires_at timestamptz,
  -- Steadfast
  steadfast_base_url text,
  steadfast_api_key text,
  steadfast_secret_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_courier_creds_tenant ON public.courier_credentials(tenant_id);

ALTER TABLE public.courier_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "courier_creds_select" ON public.courier_credentials FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));
CREATE POLICY "courier_creds_insert" ON public.courier_credentials FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));
CREATE POLICY "courier_creds_update" ON public.courier_credentials FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));
CREATE POLICY "courier_creds_delete" ON public.courier_credentials FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

CREATE TRIGGER trg_courier_creds_set_tenant BEFORE INSERT ON public.courier_credentials
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE TRIGGER trg_courier_creds_updated_at BEFORE UPDATE ON public.courier_credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add courier label/consignment fields to shipments
ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS courier_consignment_id text,
  ADD COLUMN IF NOT EXISTS courier_label_url text,
  ADD COLUMN IF NOT EXISTS courier_provider text,
  ADD COLUMN IF NOT EXISTS courier_status text,
  ADD COLUMN IF NOT EXISTS courier_payload jsonb;

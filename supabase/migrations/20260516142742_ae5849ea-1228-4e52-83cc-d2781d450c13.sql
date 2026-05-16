CREATE TABLE public.sidebar_permission_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid,
  is_admin boolean NOT NULL DEFAULT false,
  permission_keys text[] NOT NULL DEFAULT '{}',
  module_permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  route text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_spa_user ON public.sidebar_permission_audit(user_id, created_at DESC);
CREATE INDEX idx_spa_tenant ON public.sidebar_permission_audit(tenant_id, created_at DESC);

ALTER TABLE public.sidebar_permission_audit ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_spa_set_tenant
  BEFORE INSERT ON public.sidebar_permission_audit
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

CREATE POLICY "Users insert own audit rows"
  ON public.sidebar_permission_audit FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own audit rows"
  ON public.sidebar_permission_audit FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Tenant admins view tenant audit rows"
  ON public.sidebar_permission_audit FOR SELECT
  USING (
    public.is_superadmin(auth.uid())
    OR (
      public.is_tenant_manager_or_above(auth.uid())
      AND tenant_id = public.get_user_tenant_id(auth.uid())
    )
  );
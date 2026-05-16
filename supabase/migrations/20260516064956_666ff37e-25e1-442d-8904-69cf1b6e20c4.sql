CREATE TABLE public.tenant_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email','sms','push')),
  subject text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','failed','pending')),
  error text,
  read_at timestamptz,
  sent_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenant_notifications_tenant ON public.tenant_notifications(tenant_id, created_at DESC);

ALTER TABLE public.tenant_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins manage all notifications"
  ON public.tenant_notifications FOR ALL
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "Tenant members view own push notifications"
  ON public.tenant_notifications FOR SELECT
  USING (channel = 'push' AND tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant members mark own push read"
  ON public.tenant_notifications FOR UPDATE
  USING (channel = 'push' AND tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (channel = 'push' AND tenant_id = public.get_user_tenant_id(auth.uid()));
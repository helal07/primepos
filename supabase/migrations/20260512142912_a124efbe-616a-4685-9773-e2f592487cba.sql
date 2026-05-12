
CREATE TABLE public.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  tracking_no TEXT,
  courier TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  recipient_name TEXT,
  recipient_phone TEXT,
  shipping_address TEXT,
  city TEXT,
  shipping_cost NUMERIC NOT NULL DEFAULT 0,
  weight NUMERIC,
  expected_delivery DATE,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shipments_tenant ON public.shipments(tenant_id);
CREATE INDEX idx_shipments_sale ON public.shipments(sale_id);
CREATE INDEX idx_shipments_status ON public.shipments(status);

ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY shipments_select ON public.shipments FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id(auth.uid())) OR is_superadmin(auth.uid()));
CREATE POLICY shipments_insert ON public.shipments FOR INSERT TO authenticated
  WITH CHECK ((tenant_id IS NULL) OR (tenant_id = get_user_tenant_id(auth.uid())) OR is_superadmin(auth.uid()));
CREATE POLICY shipments_update ON public.shipments FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id(auth.uid())) OR is_superadmin(auth.uid()));
CREATE POLICY shipments_delete ON public.shipments FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id(auth.uid())) OR is_superadmin(auth.uid()));

CREATE TRIGGER trg_shipments_set_tenant BEFORE INSERT ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER trg_shipments_updated_at BEFORE UPDATE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.shipment_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  changed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ssh_shipment ON public.shipment_status_history(shipment_id);

ALTER TABLE public.shipment_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY ssh_select ON public.shipment_status_history FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id(auth.uid())) OR is_superadmin(auth.uid()));
CREATE POLICY ssh_insert ON public.shipment_status_history FOR INSERT TO authenticated
  WITH CHECK ((tenant_id IS NULL) OR (tenant_id = get_user_tenant_id(auth.uid())) OR is_superadmin(auth.uid()));
CREATE POLICY ssh_delete ON public.shipment_status_history FOR DELETE TO authenticated
  USING ((tenant_id = get_user_tenant_id(auth.uid())) OR is_superadmin(auth.uid()));

CREATE TRIGGER trg_ssh_set_tenant BEFORE INSERT ON public.shipment_status_history
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

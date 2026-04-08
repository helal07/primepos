
-- Product Variations
CREATE TABLE public.product_variations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  barcode TEXT,
  purchase_price NUMERIC NOT NULL DEFAULT 0,
  selling_price NUMERIC NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  alert_quantity INTEGER NOT NULL DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_variations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view variations"
  ON public.product_variations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can insert variations"
  ON public.product_variations FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_manager_or_above(auth.uid()) OR public.has_module_permission(auth.uid(), 'products', 'can_create'));
CREATE POLICY "Managers can update variations"
  ON public.product_variations FOR UPDATE TO authenticated
  USING (public.is_tenant_manager_or_above(auth.uid()) OR public.has_module_permission(auth.uid(), 'products', 'can_edit'));
CREATE POLICY "Managers can delete variations"
  ON public.product_variations FOR DELETE TO authenticated
  USING (public.is_tenant_manager_or_above(auth.uid()) OR public.has_module_permission(auth.uid(), 'products', 'can_delete'));

-- Stock Adjustments
CREATE TABLE public.stock_adjustments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variation_id UUID REFERENCES public.product_variations(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'addition',
  quantity_change INTEGER NOT NULL,
  reason TEXT NOT NULL,
  notes TEXT,
  adjusted_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view adjustments"
  ON public.stock_adjustments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can insert adjustments"
  ON public.stock_adjustments FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_manager_or_above(auth.uid()) OR public.has_module_permission(auth.uid(), 'products', 'can_create'));

-- Stock Transfers
CREATE TABLE public.stock_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variation_id UUID REFERENCES public.product_variations(id) ON DELETE SET NULL,
  from_branch TEXT NOT NULL DEFAULT 'Main',
  to_branch TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view transfers"
  ON public.stock_transfers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can insert transfers"
  ON public.stock_transfers FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_manager_or_above(auth.uid()) OR public.has_module_permission(auth.uid(), 'products', 'can_create'));
CREATE POLICY "Managers can update transfers"
  ON public.stock_transfers FOR UPDATE TO authenticated
  USING (public.is_tenant_manager_or_above(auth.uid()) OR public.has_module_permission(auth.uid(), 'products', 'can_edit'));

-- Triggers
CREATE TRIGGER update_product_variations_updated_at
  BEFORE UPDATE ON public.product_variations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stock_transfers_updated_at
  BEFORE UPDATE ON public.stock_transfers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

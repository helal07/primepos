
CREATE TABLE public.purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES public.suppliers(id),
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_number TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  shipping_cost NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  payment_method TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "purchases_select" ON public.purchases FOR SELECT TO authenticated USING (public.has_module_permission(auth.uid(), 'purchases', 'view'));
CREATE POLICY "purchases_insert" ON public.purchases FOR INSERT TO authenticated WITH CHECK (public.has_module_permission(auth.uid(), 'purchases', 'create'));
CREATE POLICY "purchases_update" ON public.purchases FOR UPDATE TO authenticated USING (public.has_module_permission(auth.uid(), 'purchases', 'edit'));
CREATE POLICY "purchases_delete" ON public.purchases FOR DELETE TO authenticated USING (public.has_module_permission(auth.uid(), 'purchases', 'delete'));

CREATE TABLE public.purchase_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  variation_id UUID REFERENCES public.product_variations(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  received_quantity INTEGER NOT NULL DEFAULT 0,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  tax_percent NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  serial_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pitems_select" ON public.purchase_items FOR SELECT TO authenticated USING (public.has_module_permission(auth.uid(), 'purchases', 'view'));
CREATE POLICY "pitems_insert" ON public.purchase_items FOR INSERT TO authenticated WITH CHECK (public.has_module_permission(auth.uid(), 'purchases', 'create'));
CREATE POLICY "pitems_update" ON public.purchase_items FOR UPDATE TO authenticated USING (public.has_module_permission(auth.uid(), 'purchases', 'edit'));
CREATE POLICY "pitems_delete" ON public.purchase_items FOR DELETE TO authenticated USING (public.has_module_permission(auth.uid(), 'purchases', 'delete'));

CREATE TABLE public.purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES public.suppliers(id),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date DATE,
  reference_number TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "po_select" ON public.purchase_orders FOR SELECT TO authenticated USING (public.has_module_permission(auth.uid(), 'purchases', 'view'));
CREATE POLICY "po_insert" ON public.purchase_orders FOR INSERT TO authenticated WITH CHECK (public.has_module_permission(auth.uid(), 'purchases', 'create'));
CREATE POLICY "po_update" ON public.purchase_orders FOR UPDATE TO authenticated USING (public.has_module_permission(auth.uid(), 'purchases', 'edit'));
CREATE POLICY "po_delete" ON public.purchase_orders FOR DELETE TO authenticated USING (public.has_module_permission(auth.uid(), 'purchases', 'delete'));

CREATE TABLE public.purchase_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  variation_id UUID REFERENCES public.product_variations(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "poi_select" ON public.purchase_order_items FOR SELECT TO authenticated USING (public.has_module_permission(auth.uid(), 'purchases', 'view'));
CREATE POLICY "poi_insert" ON public.purchase_order_items FOR INSERT TO authenticated WITH CHECK (public.has_module_permission(auth.uid(), 'purchases', 'create'));
CREATE POLICY "poi_update" ON public.purchase_order_items FOR UPDATE TO authenticated USING (public.has_module_permission(auth.uid(), 'purchases', 'edit'));
CREATE POLICY "poi_delete" ON public.purchase_order_items FOR DELETE TO authenticated USING (public.has_module_permission(auth.uid(), 'purchases', 'delete'));

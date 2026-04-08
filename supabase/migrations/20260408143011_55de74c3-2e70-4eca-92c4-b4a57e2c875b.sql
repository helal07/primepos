
-- Sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START 1001;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE sql
SET search_path = public
AS $$
  SELECT 'INV-' || lpad(nextval('public.invoice_number_seq')::text, 6, '0')
$$;

-- Sales table
CREATE TABLE public.sales (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number text NOT NULL DEFAULT public.generate_invoice_number(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  sale_date timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'completed',
  subtotal numeric NOT NULL DEFAULT 0,
  discount_type text DEFAULT 'fixed',
  discount_value numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  shipping_cost numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  payment_method text DEFAULT 'cash',
  payment_status text NOT NULL DEFAULT 'paid',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view sales" ON public.sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Sales create" ON public.sales FOR INSERT TO authenticated WITH CHECK (
  is_tenant_manager_or_above(auth.uid()) OR has_module_permission(auth.uid(), 'sales', 'create')
);
CREATE POLICY "Sales update" ON public.sales FOR UPDATE TO authenticated USING (
  is_tenant_manager_or_above(auth.uid()) OR has_module_permission(auth.uid(), 'sales', 'edit')
);
CREATE POLICY "Sales delete" ON public.sales FOR DELETE TO authenticated USING (
  is_tenant_manager_or_above(auth.uid()) OR has_module_permission(auth.uid(), 'sales', 'delete')
);

CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sale items table
CREATE TABLE public.sale_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variation_id uuid REFERENCES public.product_variations(id) ON DELETE SET NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  tax_percent numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  serial_number text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view sale items" ON public.sale_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Sale items create" ON public.sale_items FOR INSERT TO authenticated WITH CHECK (
  is_tenant_manager_or_above(auth.uid()) OR has_module_permission(auth.uid(), 'sales', 'create')
);
CREATE POLICY "Sale items update" ON public.sale_items FOR UPDATE TO authenticated USING (
  is_tenant_manager_or_above(auth.uid()) OR has_module_permission(auth.uid(), 'sales', 'edit')
);
CREATE POLICY "Sale items delete" ON public.sale_items FOR DELETE TO authenticated USING (
  is_tenant_manager_or_above(auth.uid()) OR has_module_permission(auth.uid(), 'sales', 'delete')
);

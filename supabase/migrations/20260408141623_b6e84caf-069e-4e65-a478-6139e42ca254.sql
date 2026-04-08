
-- Customers
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  company TEXT,
  tax_number TEXT,
  balance NUMERIC NOT NULL DEFAULT 0,
  total_purchases INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view customers"
  ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can insert customers"
  ON public.customers FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_manager_or_above(auth.uid()) OR public.has_module_permission(auth.uid(), 'contacts', 'can_create'));
CREATE POLICY "Managers can update customers"
  ON public.customers FOR UPDATE TO authenticated
  USING (public.is_tenant_manager_or_above(auth.uid()) OR public.has_module_permission(auth.uid(), 'contacts', 'can_edit'));
CREATE POLICY "Managers can delete customers"
  ON public.customers FOR DELETE TO authenticated
  USING (public.is_tenant_manager_or_above(auth.uid()) OR public.has_module_permission(auth.uid(), 'contacts', 'can_delete'));

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Suppliers
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  company TEXT,
  tax_number TEXT,
  balance NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view suppliers"
  ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can insert suppliers"
  ON public.suppliers FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_manager_or_above(auth.uid()) OR public.has_module_permission(auth.uid(), 'contacts', 'can_create'));
CREATE POLICY "Managers can update suppliers"
  ON public.suppliers FOR UPDATE TO authenticated
  USING (public.is_tenant_manager_or_above(auth.uid()) OR public.has_module_permission(auth.uid(), 'contacts', 'can_edit'));
CREATE POLICY "Managers can delete suppliers"
  ON public.suppliers FOR DELETE TO authenticated
  USING (public.is_tenant_manager_or_above(auth.uid()) OR public.has_module_permission(auth.uid(), 'contacts', 'can_delete'));

CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

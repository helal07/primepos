
-- Categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Brands table
CREATE TABLE IF NOT EXISTS public.brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Units table
CREATE TABLE IF NOT EXISTS public.units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  barcode TEXT,
  description TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  alert_quantity INTEGER NOT NULL DEFAULT 5,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  has_warranty BOOLEAN NOT NULL DEFAULT false,
  warranty_duration INTEGER,
  warranty_type TEXT,
  serial_tracking BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Categories policies
CREATE POLICY "categories_select" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "categories_insert" ON public.categories FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_manager_or_above(auth.uid()) OR public.has_module_permission(auth.uid(), 'products'::text, 'create'::text));
CREATE POLICY "categories_update" ON public.categories FOR UPDATE TO authenticated
  USING (public.is_tenant_manager_or_above(auth.uid()) OR public.has_module_permission(auth.uid(), 'products'::text, 'edit'::text));
CREATE POLICY "categories_delete" ON public.categories FOR DELETE TO authenticated
  USING (public.is_tenant_manager_or_above(auth.uid()) OR public.has_module_permission(auth.uid(), 'products'::text, 'delete'::text));

-- Brands policies
CREATE POLICY "brands_select" ON public.brands FOR SELECT TO authenticated USING (true);
CREATE POLICY "brands_insert" ON public.brands FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_manager_or_above(auth.uid()) OR public.has_module_permission(auth.uid(), 'products'::text, 'create'::text));
CREATE POLICY "brands_update" ON public.brands FOR UPDATE TO authenticated
  USING (public.is_tenant_manager_or_above(auth.uid()) OR public.has_module_permission(auth.uid(), 'products'::text, 'edit'::text));
CREATE POLICY "brands_delete" ON public.brands FOR DELETE TO authenticated
  USING (public.is_tenant_manager_or_above(auth.uid()) OR public.has_module_permission(auth.uid(), 'products'::text, 'delete'::text));

-- Units policies
CREATE POLICY "units_select" ON public.units FOR SELECT TO authenticated USING (true);
CREATE POLICY "units_insert" ON public.units FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_manager_or_above(auth.uid()) OR public.has_module_permission(auth.uid(), 'products'::text, 'create'::text));
CREATE POLICY "units_update" ON public.units FOR UPDATE TO authenticated
  USING (public.is_tenant_manager_or_above(auth.uid()) OR public.has_module_permission(auth.uid(), 'products'::text, 'edit'::text));
CREATE POLICY "units_delete" ON public.units FOR DELETE TO authenticated
  USING (public.is_tenant_manager_or_above(auth.uid()) OR public.has_module_permission(auth.uid(), 'products'::text, 'delete'::text));

-- Products policies
CREATE POLICY "products_select" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "products_insert" ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_manager_or_above(auth.uid()) OR public.has_module_permission(auth.uid(), 'products'::text, 'create'::text));
CREATE POLICY "products_update" ON public.products FOR UPDATE TO authenticated
  USING (public.is_tenant_manager_or_above(auth.uid()) OR public.has_module_permission(auth.uid(), 'products'::text, 'edit'::text));
CREATE POLICY "products_delete" ON public.products FOR DELETE TO authenticated
  USING (public.is_tenant_manager_or_above(auth.uid()) OR public.has_module_permission(auth.uid(), 'products'::text, 'delete'::text));

-- Updated_at triggers
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON public.units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_brand ON public.products(brand_id);
CREATE INDEX idx_products_sku ON public.products(sku);
CREATE INDEX idx_categories_parent ON public.categories(parent_id);


-- ============ BRANCHES ============
CREATE TABLE IF NOT EXISTS public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  address text,
  city text,
  phone text,
  email text,
  manager_user_id uuid,
  opening_time time,
  closing_time time,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_branches_tenant ON public.branches(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_branches_tenant_code ON public.branches(tenant_id, code) WHERE code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_branches_one_default_per_tenant ON public.branches(tenant_id) WHERE is_default = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.branches TO authenticated;
GRANT ALL ON public.branches TO service_role;

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "branches_select_tenant" ON public.branches
  FOR SELECT TO authenticated
  USING (
    public.is_superadmin(auth.uid())
    OR tenant_id = public.get_user_tenant_id(auth.uid())
  );

CREATE POLICY "branches_insert_manager" ON public.branches
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_superadmin(auth.uid())
    OR (
      tenant_id = public.get_user_tenant_id(auth.uid())
      AND public.is_tenant_manager_or_above(auth.uid())
    )
  );

CREATE POLICY "branches_update_manager" ON public.branches
  FOR UPDATE TO authenticated
  USING (
    public.is_superadmin(auth.uid())
    OR (
      tenant_id = public.get_user_tenant_id(auth.uid())
      AND public.is_tenant_manager_or_above(auth.uid())
    )
  )
  WITH CHECK (
    public.is_superadmin(auth.uid())
    OR (
      tenant_id = public.get_user_tenant_id(auth.uid())
      AND public.is_tenant_manager_or_above(auth.uid())
    )
  );

CREATE POLICY "branches_delete_manager" ON public.branches
  FOR DELETE TO authenticated
  USING (
    public.is_superadmin(auth.uid())
    OR (
      tenant_id = public.get_user_tenant_id(auth.uid())
      AND public.is_tenant_manager_or_above(auth.uid())
    )
  );

-- Auto-fill tenant_id
DROP TRIGGER IF EXISTS trg_branches_set_tenant ON public.branches;
CREATE TRIGGER trg_branches_set_tenant
  BEFORE INSERT ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

-- updated_at
DROP TRIGGER IF EXISTS trg_branches_updated_at ON public.branches;
CREATE TRIGGER trg_branches_updated_at
  BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ MODULES REGISTRY ============
CREATE TABLE IF NOT EXISTS public.modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  icon text,
  category text,
  sort_order int NOT NULL DEFAULT 0,
  is_core boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.modules TO authenticated, anon;
GRANT ALL ON public.modules TO service_role;

ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "modules_select_all" ON public.modules
  FOR SELECT USING (true);

CREATE POLICY "modules_insert_super" ON public.modules
  FOR INSERT TO authenticated
  WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "modules_update_super" ON public.modules
  FOR UPDATE TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "modules_delete_super" ON public.modules
  FOR DELETE TO authenticated
  USING (public.is_superadmin(auth.uid()));

DROP TRIGGER IF EXISTS trg_modules_updated_at ON public.modules;
CREATE TRIGGER trg_modules_updated_at
  BEFORE UPDATE ON public.modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default modules
INSERT INTO public.modules (key, name, description, icon, category, sort_order, is_core) VALUES
  ('pos',        'Point of Sale', 'Cash register, sales, invoices',         'ShoppingCart', 'sales',     10, true),
  ('inventory',  'Inventory',     'Products, stock, warehouses',            'Package',      'stock',     20, true),
  ('purchases',  'Purchases',     'Suppliers and purchase orders',          'Truck',        'stock',     30, true),
  ('sales',      'Sales',         'Sales history, orders, customers',       'Receipt',      'sales',     40, true),
  ('hrm',        'HRM',           'Employees, attendance, payroll',         'Users',        'people',    50, false),
  ('accounting', 'Accounting',    'Accounts, journal, trial balance',       'Calculator',   'finance',   60, false),
  ('expenses',   'Expenses',      'Expense tracking & categories',          'Wallet',       'finance',   70, false),
  ('cms',        'CMS',           'Website pages, blog, landing',           'Globe',        'website',   80, false),
  ('warranty',   'Warranty',      'Warranty registration & claims',         'ShieldCheck',  'service',   90, false),
  ('reports',    'Reports & BI',  'Business intelligence dashboards',       'BarChart3',    'analytics', 100, true),
  ('settings',   'Settings',      'Tenant configuration',                   'Settings',     'system',    110, true)
ON CONFLICT (key) DO NOTHING;

-- ============ LINK WAREHOUSES → BRANCHES ============
ALTER TABLE public.warehouses
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_warehouses_branch ON public.warehouses(branch_id);

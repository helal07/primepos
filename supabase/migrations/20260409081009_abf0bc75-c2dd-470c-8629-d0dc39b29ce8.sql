
-- 1. Add tenant_id to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- 2. Create get_user_tenant_id function
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- 3. Add tenant_id to all data tables
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.product_variations ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.purchase_items ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.purchase_order_items ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.stock_adjustments ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.stock_transfers ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.payroll ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.journal_entry_lines ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.warranty_claims ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.cms_pages ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.cms_media ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.role_permissions ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.installment_customers ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.installment_sales ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.installment_schedules ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.installment_collections ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- 4. Create auto-set tenant_id trigger function
CREATE OR REPLACE FUNCTION public.set_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := get_user_tenant_id(auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

-- 5. Create triggers for all tables
CREATE TRIGGER set_tenant_id_products BEFORE INSERT ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_product_variations BEFORE INSERT ON public.product_variations FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_categories BEFORE INSERT ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_brands BEFORE INSERT ON public.brands FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_units BEFORE INSERT ON public.units FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_sales BEFORE INSERT ON public.sales FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_sale_items BEFORE INSERT ON public.sale_items FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_customers BEFORE INSERT ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_suppliers BEFORE INSERT ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_purchases BEFORE INSERT ON public.purchases FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_purchase_items BEFORE INSERT ON public.purchase_items FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_purchase_orders BEFORE INSERT ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_purchase_order_items BEFORE INSERT ON public.purchase_order_items FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_stock_adjustments BEFORE INSERT ON public.stock_adjustments FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_stock_transfers BEFORE INSERT ON public.stock_transfers FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_employees BEFORE INSERT ON public.employees FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_attendance BEFORE INSERT ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_leave_requests BEFORE INSERT ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_payroll BEFORE INSERT ON public.payroll FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_accounts BEFORE INSERT ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_transactions BEFORE INSERT ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_journal_entries BEFORE INSERT ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_journal_entry_lines BEFORE INSERT ON public.journal_entry_lines FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_warranty_claims BEFORE INSERT ON public.warranty_claims FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_cms_pages BEFORE INSERT ON public.cms_pages FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_cms_media BEFORE INSERT ON public.cms_media FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_business_settings BEFORE INSERT ON public.business_settings FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_roles BEFORE INSERT ON public.roles FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_role_permissions BEFORE INSERT ON public.role_permissions FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_user_roles BEFORE INSERT ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_activity_log BEFORE INSERT ON public.activity_log FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_installment_customers BEFORE INSERT ON public.installment_customers FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_installment_sales BEFORE INSERT ON public.installment_sales FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_installment_schedules BEFORE INSERT ON public.installment_schedules FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_installment_collections BEFORE INSERT ON public.installment_collections FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

-- 6. Drop old permissive SELECT policies and recreate with tenant isolation
-- We'll use a pattern: drop old USING(true) SELECT policies and replace them

-- products
DROP POLICY IF EXISTS "products_select" ON public.products;
CREATE POLICY "products_select" ON public.products FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

-- product_variations
DROP POLICY IF EXISTS "Authenticated users can view variations" ON public.product_variations;
CREATE POLICY "pv_select" ON public.product_variations FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

-- categories
DROP POLICY IF EXISTS "categories_select" ON public.categories;
CREATE POLICY "categories_select" ON public.categories FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

-- brands
DROP POLICY IF EXISTS "brands_select" ON public.brands;
CREATE POLICY "brands_select" ON public.brands FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

-- units (no existing select policy with USING true listed, but let's handle it)
DROP POLICY IF EXISTS "units_select" ON public.units;
CREATE POLICY "units_select" ON public.units FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

-- sales
DROP POLICY IF EXISTS "Authenticated can view sales" ON public.sales;
CREATE POLICY "sales_select" ON public.sales FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

-- sale_items
DROP POLICY IF EXISTS "Authenticated can view sale items" ON public.sale_items;
CREATE POLICY "sale_items_select" ON public.sale_items FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

-- customers
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;
CREATE POLICY "customers_select" ON public.customers FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

-- suppliers
DROP POLICY IF EXISTS "suppliers_select" ON public.suppliers;
CREATE POLICY "suppliers_select" ON public.suppliers FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

-- purchases
DROP POLICY IF EXISTS "purchases_select" ON public.purchases;
CREATE POLICY "purchases_select" ON public.purchases FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

-- purchase_items
DROP POLICY IF EXISTS "pitems_select" ON public.purchase_items;
CREATE POLICY "pitems_select" ON public.purchase_items FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

-- purchase_orders
DROP POLICY IF EXISTS "po_select" ON public.purchase_orders;
CREATE POLICY "po_select" ON public.purchase_orders FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

-- purchase_order_items
DROP POLICY IF EXISTS "poi_select" ON public.purchase_order_items;
CREATE POLICY "poi_select" ON public.purchase_order_items FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

-- stock_adjustments
DROP POLICY IF EXISTS "Authenticated users can view adjustments" ON public.stock_adjustments;
CREATE POLICY "sa_select" ON public.stock_adjustments FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

-- stock_transfers
DROP POLICY IF EXISTS "st_select" ON public.stock_transfers;
CREATE POLICY "st_select" ON public.stock_transfers FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

-- employees
DROP POLICY IF EXISTS "employees_select" ON public.employees;
CREATE POLICY "employees_select" ON public.employees FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

-- attendance
DROP POLICY IF EXISTS "attendance_select" ON public.attendance;
CREATE POLICY "attendance_select" ON public.attendance FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

-- leave_requests
DROP POLICY IF EXISTS "leave_select" ON public.leave_requests;
CREATE POLICY "leave_select" ON public.leave_requests FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

-- payroll
DROP POLICY IF EXISTS "payroll_select" ON public.payroll;
CREATE POLICY "payroll_select" ON public.payroll FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

-- accounts
DROP POLICY IF EXISTS "accounts_select" ON public.accounts;
CREATE POLICY "accounts_select" ON public.accounts FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

-- transactions
DROP POLICY IF EXISTS "transactions_select" ON public.transactions;
CREATE POLICY "transactions_select" ON public.transactions FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

-- journal_entries
DROP POLICY IF EXISTS "je_select" ON public.journal_entries;
CREATE POLICY "je_select" ON public.journal_entries FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

-- journal_entry_lines
DROP POLICY IF EXISTS "jel_select" ON public.journal_entry_lines;
CREATE POLICY "jel_select" ON public.journal_entry_lines FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

-- warranty_claims
DROP POLICY IF EXISTS "wc_select" ON public.warranty_claims;
CREATE POLICY "wc_select" ON public.warranty_claims FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

-- cms_pages
DROP POLICY IF EXISTS "cms_pages_select" ON public.cms_pages;
CREATE POLICY "cms_pages_select" ON public.cms_pages FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

-- cms_media
DROP POLICY IF EXISTS "cms_media_select" ON public.cms_media;
CREATE POLICY "cms_media_select" ON public.cms_media FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

-- business_settings
DROP POLICY IF EXISTS "settings_select" ON public.business_settings;
CREATE POLICY "settings_select" ON public.business_settings FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

-- roles
DROP POLICY IF EXISTS "Authenticated can view roles" ON public.roles;
CREATE POLICY "roles_select" ON public.roles FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()) OR is_system);

-- role_permissions
DROP POLICY IF EXISTS "Authenticated can view permissions" ON public.role_permissions;
CREATE POLICY "rp_select" ON public.role_permissions FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

-- user_roles
DROP POLICY IF EXISTS "ur_select" ON public.user_roles;
CREATE POLICY "ur_select" ON public.user_roles FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()) OR user_id = auth.uid());

-- activity_log - keep existing policies, add tenant filter
DROP POLICY IF EXISTS "Users can view own logs" ON public.activity_log;
CREATE POLICY "al_select_own" ON public.activity_log FOR SELECT TO authenticated
  USING ((auth.uid() = user_id) AND (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid())));

-- installment_customers
DROP POLICY IF EXISTS "ic_select" ON public.installment_customers;
CREATE POLICY "ic_select" ON public.installment_customers FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

-- installment_sales
DROP POLICY IF EXISTS "is_select" ON public.installment_sales;
CREATE POLICY "is_select" ON public.installment_sales FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

-- installment_schedules
DROP POLICY IF EXISTS "isch_select" ON public.installment_schedules;
CREATE POLICY "isch_select" ON public.installment_schedules FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

-- installment_collections
DROP POLICY IF EXISTS "icol_select" ON public.installment_collections;
CREATE POLICY "icol_select" ON public.installment_collections FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

-- profiles - add tenant isolation
DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()) OR user_id = auth.uid());

-- 7. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_tenant ON public.products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_tenant ON public.sales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchases_tenant ON public.purchases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON public.customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON public.suppliers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_tenant ON public.employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_accounts_tenant ON public.accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON public.profiles(tenant_id);


-- =====================================================
-- Granular permission catalog (Ultimate POS style)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.permission_catalog (
  key text PRIMARY KEY,
  module text NOT NULL,
  group_label text NOT NULL,
  label text NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.permission_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "perm_catalog_read" ON public.permission_catalog
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "perm_catalog_super_manage" ON public.permission_catalog
  FOR ALL TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

-- =====================================================
-- Role -> permission grants
-- =====================================================

CREATE TABLE IF NOT EXISTS public.role_permission_grants (
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_key text NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_rpg_role ON public.role_permission_grants(role_id);
CREATE INDEX IF NOT EXISTS idx_rpg_tenant ON public.role_permission_grants(tenant_id);

ALTER TABLE public.role_permission_grants ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_rpg_tenant_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT r.tenant_id INTO NEW.tenant_id FROM public.roles r WHERE r.id = NEW.role_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_rpg_set_tenant ON public.role_permission_grants;
CREATE TRIGGER trg_rpg_set_tenant BEFORE INSERT ON public.role_permission_grants
  FOR EACH ROW EXECUTE FUNCTION public.set_rpg_tenant_id();

CREATE POLICY "rpg_select" ON public.role_permission_grants
  FOR SELECT TO authenticated
  USING (
    public.is_superadmin(auth.uid())
    OR tenant_id IS NULL
    OR tenant_id = public.get_user_tenant_id(auth.uid())
  );

CREATE POLICY "rpg_manager_write" ON public.role_permission_grants
  FOR ALL TO authenticated
  USING (
    public.is_superadmin(auth.uid())
    OR (public.is_tenant_manager_or_above(auth.uid())
        AND (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id(auth.uid())))
  )
  WITH CHECK (
    public.is_superadmin(auth.uid())
    OR (public.is_tenant_manager_or_above(auth.uid())
        AND (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id(auth.uid())))
  );

-- =====================================================
-- Salesperson scoping columns
-- =====================================================

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS assigned_to uuid;
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS assigned_to uuid;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='exchange_purchases') THEN
    EXECUTE 'ALTER TABLE public.exchange_purchases ADD COLUMN IF NOT EXISTS assigned_to uuid';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='installments') THEN
    EXECUTE 'ALTER TABLE public.installments ADD COLUMN IF NOT EXISTS assigned_to uuid';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='warranty_claims') THEN
    EXECUTE 'ALTER TABLE public.warranty_claims ADD COLUMN IF NOT EXISTS assigned_to uuid';
  END IF;
END $$;

-- =====================================================
-- Helper: has_perm(uid, key)
-- =====================================================

CREATE OR REPLACE FUNCTION public.has_perm(_user_id uuid, _key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.is_superadmin(_user_id)
    OR public.is_tenant_manager_or_above(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.role_permission_grants g ON g.role_id = ur.role_id
      WHERE ur.user_id = _user_id AND g.permission_key = _key
    );
$$;

CREATE OR REPLACE FUNCTION public.user_sell_scope(_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN public.has_perm(_user_id, 'sell.view_all') THEN 'all'
    WHEN public.has_perm(_user_id, 'sell.view_own') THEN 'own'
    ELSE 'none'
  END;
$$;

-- =====================================================
-- Seed permission catalog (Ultimate POS parity)
-- =====================================================

INSERT INTO public.permission_catalog (key, module, group_label, label, description, sort_order) VALUES
-- SELL
('sell.view_all',           'sell', 'View',     'View all sells',                    'See every sell record', 10),
('sell.view_own',           'sell', 'View',     'View own sells only',               'Only sells assigned to or created by the user', 11),
('sell.view_paid',          'sell', 'View',     'View paid sells only',              NULL, 12),
('sell.view_due',           'sell', 'View',     'View due sells only',               NULL, 13),
('sell.view_partial',       'sell', 'View',     'View partially paid sells only',    NULL, 14),
('sell.view_overdue',       'sell', 'View',     'View overdue sells only',           NULL, 15),
('sell.add',                'sell', 'Manage',   'Add sell',                          NULL, 20),
('sell.update',             'sell', 'Manage',   'Update sell',                       NULL, 21),
('sell.delete',             'sell', 'Manage',   'Delete sell',                       NULL, 22),
('sell.commission_agent_view_own','sell','Manage','Commission agent can view their own sell', NULL, 23),
('sell.payment_add',        'sell', 'Payment',  'Add sell payment',                  NULL, 30),
('sell.payment_edit',       'sell', 'Payment',  'Edit sell payment',                 NULL, 31),
('sell.payment_delete',     'sell', 'Payment',  'Delete sell payment',               NULL, 32),
('sell.edit_price_on_pos',  'sell', 'POS',      'Edit product price from sales screen', NULL, 40),
('sell.edit_discount_on_pos','sell','POS',      'Edit product discount from sales screen', NULL, 41),
('sell.discount_manage',    'sell', 'POS',      'Add / Edit / Delete discount',      NULL, 42),
('sell.access_types_of_service','sell','POS',   'Access types of service',           NULL, 43),
('sell.access_all_return',  'sell', 'Returns',  'Access all sell return',            NULL, 50),
('sell.access_own_return',  'sell', 'Returns',  'Access own sell return',            NULL, 51),
('sell.edit_invoice_number','sell', 'Invoice',  'Add / Edit invoice number',         NULL, 60),

-- PURCHASE
('purchase.view_all',       'purchase', 'View',    'View all purchases',             NULL, 10),
('purchase.view_own',       'purchase', 'View',    'View own purchases only',        NULL, 11),
('purchase.add',            'purchase', 'Manage',  'Add purchase',                   NULL, 20),
('purchase.update',         'purchase', 'Manage',  'Update purchase',                NULL, 21),
('purchase.delete',         'purchase', 'Manage',  'Delete purchase',                NULL, 22),
('purchase.payment_add',    'purchase', 'Payment', 'Add purchase payment',           NULL, 30),
('purchase.payment_edit',   'purchase', 'Payment', 'Edit purchase payment',          NULL, 31),
('purchase.payment_delete', 'purchase', 'Payment', 'Delete purchase payment',        NULL, 32),
('purchase.access_return',  'purchase', 'Returns', 'Access purchase return',         NULL, 40),
('purchase.update_status',  'purchase', 'Manage',  'Update purchase status',         NULL, 23),

-- PRODUCT
('product.view',            'product', 'View',    'View products',                   NULL, 10),
('product.add',             'product', 'Manage',  'Add product',                     NULL, 20),
('product.update',          'product', 'Manage',  'Update product',                  NULL, 21),
('product.delete',          'product', 'Manage',  'Delete product',                  NULL, 22),
('product.opening_stock',   'product', 'Manage',  'Add opening stock',               NULL, 23),
('product.view_purchase_price','product','View',  'View purchase price',             NULL, 11),
('product.print_labels',    'product', 'Manage',  'Print labels',                    NULL, 24),

-- STOCK
('stock.view',              'stock', 'View',     'View stock',                       NULL, 10),
('stock.adjustment_add',    'stock', 'Adjust',   'Add stock adjustment',             NULL, 20),
('stock.adjustment_delete', 'stock', 'Adjust',   'Delete stock adjustment',          NULL, 21),
('stock.transfer_add',      'stock', 'Transfer', 'Add stock transfer',               NULL, 30),
('stock.transfer_delete',   'stock', 'Transfer', 'Delete stock transfer',            NULL, 31),
('stock.transfer_view',     'stock', 'Transfer', 'View stock transfer',              NULL, 32),

-- CUSTOMER
('customer.view',           'customer', 'View',   'View customers',                  NULL, 10),
('customer.add',            'customer', 'Manage', 'Add customer',                    NULL, 20),
('customer.update',         'customer', 'Manage', 'Update customer',                 NULL, 21),
('customer.delete',         'customer', 'Manage', 'Delete customer',                 NULL, 22),

-- SUPPLIER
('supplier.view',           'supplier', 'View',   'View suppliers',                  NULL, 10),
('supplier.add',            'supplier', 'Manage', 'Add supplier',                    NULL, 20),
('supplier.update',         'supplier', 'Manage', 'Update supplier',                 NULL, 21),
('supplier.delete',         'supplier', 'Manage', 'Delete supplier',                 NULL, 22),

-- EXPENSE
('expense.view_all',        'expense', 'View',    'View all expenses',               NULL, 10),
('expense.view_own',        'expense', 'View',    'View own expenses only',          NULL, 11),
('expense.add',             'expense', 'Manage',  'Add expense',                     NULL, 20),
('expense.update',          'expense', 'Manage',  'Update expense',                  NULL, 21),
('expense.delete',          'expense', 'Manage',  'Delete expense',                  NULL, 22),

-- ACCOUNTING
('account.view',            'account', 'View',    'View accounts',                   NULL, 10),
('account.add',             'account', 'Manage',  'Add account',                     NULL, 20),
('account.update',          'account', 'Manage',  'Update account',                  NULL, 21),
('account.delete',          'account', 'Manage',  'Delete account',                  NULL, 22),
('account.close',           'account', 'Manage',  'Close account',                   NULL, 23),
('account.fund_transfer',   'account', 'Manage',  'Fund transfer',                   NULL, 24),
('account.deposit',         'account', 'Manage',  'Deposit / Withdraw',              NULL, 25),

-- HRM
('hrm.employee_view',       'hrm', 'Employees', 'View employees',                    NULL, 10),
('hrm.employee_add',        'hrm', 'Employees', 'Add employee',                      NULL, 11),
('hrm.employee_update',     'hrm', 'Employees', 'Update employee',                   NULL, 12),
('hrm.employee_delete',     'hrm', 'Employees', 'Delete employee',                   NULL, 13),
('hrm.attendance_view',     'hrm', 'Attendance','View attendance',                   NULL, 20),
('hrm.attendance_manage',   'hrm', 'Attendance','Manage attendance',                 NULL, 21),
('hrm.payroll_view',        'hrm', 'Payroll',   'View payroll',                      NULL, 30),
('hrm.payroll_manage',      'hrm', 'Payroll',   'Manage payroll',                    NULL, 31),
('hrm.leave_view',          'hrm', 'Leave',     'View leaves',                       NULL, 40),
('hrm.leave_manage',        'hrm', 'Leave',     'Manage leaves',                     NULL, 41),

-- WARRANTY
('warranty.view',           'warranty', 'View',   'View warranty claims',            NULL, 10),
('warranty.add',            'warranty', 'Manage', 'Add warranty claim',              NULL, 20),
('warranty.update',         'warranty', 'Manage', 'Update warranty claim',           NULL, 21),
('warranty.delete',         'warranty', 'Manage', 'Delete warranty claim',           NULL, 22),

-- EXCHANGE
('exchange.view',           'exchange', 'View',   'View exchange stock',             NULL, 10),
('exchange.purchase_add',   'exchange', 'Manage', 'Add exchange purchase',           NULL, 20),
('exchange.purchase_update','exchange', 'Manage', 'Update exchange purchase',        NULL, 21),
('exchange.purchase_delete','exchange', 'Manage', 'Delete exchange purchase',        NULL, 22),
('exchange.sale_add',       'exchange', 'Manage', 'Sell exchange item',              NULL, 23),

-- INSTALLMENT
('installment.view',        'installment', 'View',   'View installments',            NULL, 10),
('installment.add',         'installment', 'Manage', 'Add installment plan',         NULL, 20),
('installment.update',      'installment', 'Manage', 'Update installment plan',      NULL, 21),
('installment.delete',      'installment', 'Manage', 'Delete installment plan',      NULL, 22),
('installment.payment',     'installment', 'Payment','Receive installment payment',  NULL, 30),

-- CMS
('cms.view',                'cms', 'View',   'View website content',                 NULL, 10),
('cms.edit',                'cms', 'Manage', 'Edit website content',                 NULL, 20),
('cms.publish',             'cms', 'Manage', 'Publish website',                      NULL, 21),

-- REPORTS
('report.profit_loss',      'report', 'Reports', 'Profit / Loss report',             NULL, 10),
('report.sales',            'report', 'Reports', 'Sales report',                     NULL, 11),
('report.purchase',         'report', 'Reports', 'Purchase report',                  NULL, 12),
('report.stock',            'report', 'Reports', 'Stock report',                     NULL, 13),
('report.tax',              'report', 'Reports', 'Tax report',                       NULL, 14),
('report.expense',          'report', 'Reports', 'Expense report',                   NULL, 15),
('report.customer_supplier','report', 'Reports', 'Customer & Supplier report',       NULL, 16),
('report.register',         'report', 'Reports', 'Cash register report',             NULL, 17),

-- SETTINGS
('settings.business',       'settings', 'Settings', 'Business settings',             NULL, 10),
('settings.tax_rates',      'settings', 'Settings', 'Tax rates',                     NULL, 11),
('settings.units',          'settings', 'Settings', 'Units',                         NULL, 12),
('settings.brands',         'settings', 'Settings', 'Brands',                        NULL, 13),
('settings.categories',     'settings', 'Settings', 'Categories',                    NULL, 14),
('settings.warehouses',     'settings', 'Settings', 'Warehouses / Locations',        NULL, 15),
('settings.invoice',        'settings', 'Settings', 'Invoice settings',              NULL, 16),
('settings.barcode',        'settings', 'Settings', 'Barcode settings',              NULL, 17),
('settings.users',          'settings', 'Users',    'Manage users',                  NULL, 20),
('settings.roles',          'settings', 'Users',    'Manage roles & permissions',    NULL, 21)
ON CONFLICT (key) DO UPDATE SET
  module = EXCLUDED.module,
  group_label = EXCLUDED.group_label,
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

-- =====================================================
-- Data migration: expand existing role_permissions -> grants
-- =====================================================

-- Map old module names to new key prefixes
DO $$
DECLARE
  r record;
  v_mod text;
  v_keys text[];
  v_k text;
BEGIN
  FOR r IN SELECT * FROM public.role_permissions LOOP
    v_keys := ARRAY[]::text[];
    v_mod := r.module;

    -- Translate old module to new namespace
    IF v_mod IN ('sales','pos') THEN v_mod := 'sell';
    ELSIF v_mod = 'purchases' THEN v_mod := 'purchase';
    ELSIF v_mod = 'products' THEN v_mod := 'product';
    ELSIF v_mod = 'customers' THEN v_mod := 'customer';
    ELSIF v_mod = 'suppliers' THEN v_mod := 'supplier';
    ELSIF v_mod = 'accounting' THEN v_mod := 'account';
    ELSIF v_mod = 'expenses' THEN v_mod := 'expense';
    END IF;

    -- View
    IF r.can_view THEN
      IF v_mod = 'sell' THEN
        v_keys := v_keys || ARRAY['sell.view_all','sell.view_paid','sell.view_due','sell.view_partial','sell.view_overdue'];
      ELSIF v_mod = 'purchase' THEN
        v_keys := v_keys || ARRAY['purchase.view_all'];
      ELSIF v_mod = 'expense' THEN
        v_keys := v_keys || ARRAY['expense.view_all'];
      ELSIF v_mod = 'hrm' THEN
        v_keys := v_keys || ARRAY['hrm.employee_view','hrm.attendance_view','hrm.payroll_view','hrm.leave_view'];
      ELSIF v_mod = 'warranty' THEN v_keys := v_keys || ARRAY['warranty.view'];
      ELSIF v_mod = 'cms' THEN v_keys := v_keys || ARRAY['cms.view'];
      ELSIF v_mod = 'account' THEN v_keys := v_keys || ARRAY['account.view'];
      ELSIF v_mod IN ('product','customer','supplier','stock') THEN
        v_keys := v_keys || ARRAY[v_mod || '.view'];
      ELSIF v_mod IN ('brands','categories','units','settings','dashboard','roles','users') THEN
        -- skip; handled by tenant manager flag
        NULL;
      END IF;
    END IF;

    -- Create
    IF r.can_create THEN
      IF v_mod = 'sell' THEN v_keys := v_keys || ARRAY['sell.add','sell.payment_add','sell.edit_price_on_pos','sell.edit_discount_on_pos','sell.edit_invoice_number'];
      ELSIF v_mod = 'purchase' THEN v_keys := v_keys || ARRAY['purchase.add','purchase.payment_add'];
      ELSIF v_mod = 'product' THEN v_keys := v_keys || ARRAY['product.add','product.opening_stock'];
      ELSIF v_mod = 'expense' THEN v_keys := v_keys || ARRAY['expense.add'];
      ELSIF v_mod = 'customer' THEN v_keys := v_keys || ARRAY['customer.add'];
      ELSIF v_mod = 'supplier' THEN v_keys := v_keys || ARRAY['supplier.add'];
      ELSIF v_mod = 'stock' THEN v_keys := v_keys || ARRAY['stock.adjustment_add','stock.transfer_add'];
      ELSIF v_mod = 'account' THEN v_keys := v_keys || ARRAY['account.add','account.fund_transfer','account.deposit'];
      ELSIF v_mod = 'hrm' THEN v_keys := v_keys || ARRAY['hrm.employee_add','hrm.attendance_manage','hrm.leave_manage'];
      ELSIF v_mod = 'warranty' THEN v_keys := v_keys || ARRAY['warranty.add'];
      END IF;
    END IF;

    -- Edit
    IF r.can_edit THEN
      IF v_mod = 'sell' THEN v_keys := v_keys || ARRAY['sell.update','sell.payment_edit'];
      ELSIF v_mod = 'purchase' THEN v_keys := v_keys || ARRAY['purchase.update','purchase.payment_edit','purchase.update_status'];
      ELSIF v_mod = 'product' THEN v_keys := v_keys || ARRAY['product.update'];
      ELSIF v_mod = 'expense' THEN v_keys := v_keys || ARRAY['expense.update'];
      ELSIF v_mod = 'customer' THEN v_keys := v_keys || ARRAY['customer.update'];
      ELSIF v_mod = 'supplier' THEN v_keys := v_keys || ARRAY['supplier.update'];
      ELSIF v_mod = 'account' THEN v_keys := v_keys || ARRAY['account.update'];
      ELSIF v_mod = 'hrm' THEN v_keys := v_keys || ARRAY['hrm.employee_update','hrm.payroll_manage'];
      ELSIF v_mod = 'warranty' THEN v_keys := v_keys || ARRAY['warranty.update'];
      ELSIF v_mod = 'cms' THEN v_keys := v_keys || ARRAY['cms.edit','cms.publish'];
      END IF;
    END IF;

    -- Delete
    IF r.can_delete THEN
      IF v_mod = 'sell' THEN v_keys := v_keys || ARRAY['sell.delete','sell.payment_delete'];
      ELSIF v_mod = 'purchase' THEN v_keys := v_keys || ARRAY['purchase.delete','purchase.payment_delete'];
      ELSIF v_mod = 'product' THEN v_keys := v_keys || ARRAY['product.delete'];
      ELSIF v_mod = 'expense' THEN v_keys := v_keys || ARRAY['expense.delete'];
      ELSIF v_mod = 'customer' THEN v_keys := v_keys || ARRAY['customer.delete'];
      ELSIF v_mod = 'supplier' THEN v_keys := v_keys || ARRAY['supplier.delete'];
      ELSIF v_mod = 'stock' THEN v_keys := v_keys || ARRAY['stock.adjustment_delete','stock.transfer_delete'];
      ELSIF v_mod = 'account' THEN v_keys := v_keys || ARRAY['account.delete','account.close'];
      ELSIF v_mod = 'hrm' THEN v_keys := v_keys || ARRAY['hrm.employee_delete'];
      ELSIF v_mod = 'warranty' THEN v_keys := v_keys || ARRAY['warranty.delete'];
      END IF;
    END IF;

    -- Insert grants (dedupe via ON CONFLICT)
    FOREACH v_k IN ARRAY v_keys LOOP
      INSERT INTO public.role_permission_grants (role_id, permission_key, tenant_id)
      VALUES (r.role_id, v_k, r.tenant_id)
      ON CONFLICT (role_id, permission_key) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

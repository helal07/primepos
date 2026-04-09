
-- Create BEFORE INSERT triggers on all tenant-scoped tables to auto-set tenant_id
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'products','categories','brands','units','product_variations',
    'sales','sale_items','purchases','purchase_items',
    'purchase_orders','purchase_order_items',
    'customers','suppliers','employees','attendance','leave_requests','payroll',
    'accounts','transactions','journal_entries','journal_entry_lines',
    'installment_customers','installment_sales','installment_schedules','installment_collections',
    'stock_adjustments','stock_transfers','warranty_claims',
    'cms_pages','cms_media','business_settings','activity_log',
    'role_permissions','roles','user_roles'
  ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER set_%I_tenant_id BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id()',
      tbl, tbl
    );
  END LOOP;
END $$;

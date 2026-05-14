
-- Enforce per-tenant module entitlement at the database layer.
-- Uses RESTRICTIVE policies which AND with existing permissive policies,
-- so a tenant whose package/override does not include a module cannot
-- read or modify rows in that module's tables (superadmin always allowed,
-- and unauthenticated storefront reads are not blocked).

DO $$
DECLARE
  rec record;
  modmap text[][] := ARRAY[
    ['warehouses','warehouses'],
    ['warehouses','warehouse_stock'],
    ['warehouses','stock_transfers'],
    ['contacts','customers'],
    ['contacts','customer_groups'],
    ['contacts','suppliers'],
    ['products','products'],
    ['products','product_variations'],
    ['products','categories'],
    ['products','brands'],
    ['products','units'],
    ['products','selling_price_groups'],
    ['products','product_group_prices'],
    ['products','stock_adjustments'],
    ['purchases','purchases'],
    ['purchases','purchase_items'],
    ['purchases','purchase_orders'],
    ['purchases','purchase_order_items'],
    ['purchases','purchase_payments'],
    ['sales','sales'],
    ['sales','sale_items'],
    ['sales','sale_payments'],
    ['sales','shipments'],
    ['sales','shipment_status_history'],
    ['expenses','expenses'],
    ['expenses','expense_categories'],
    ['expenses','expense_payments'],
    ['accounting','accounts'],
    ['accounting','transactions'],
    ['accounting','journal_entries'],
    ['accounting','journal_entry_lines'],
    ['hrm','employees'],
    ['hrm','attendance'],
    ['hrm','leave_requests'],
    ['hrm','payroll'],
    ['warranty','warranties'],
    ['warranty','warranty_claims'],
    ['installments','installment_customers'],
    ['installments','installment_sales'],
    ['installments','installment_collections'],
    ['installments','installment_schedules'],
    ['exchange','exchange_purchases']
  ];
  i int;
  m text;
  t text;
BEGIN
  FOR i IN 1 .. array_length(modmap,1) LOOP
    m := modmap[i][1];
    t := modmap[i][2];
    EXECUTE format('DROP POLICY IF EXISTS module_entitlement_required ON public.%I', t);
    EXECUTE format($f$
      CREATE POLICY module_entitlement_required ON public.%I
        AS RESTRICTIVE
        FOR ALL
        TO public
        USING (
          auth.uid() IS NULL
          OR public.is_superadmin(auth.uid())
          OR public.tenant_has_module(auth.uid(), %L)
        )
        WITH CHECK (
          auth.uid() IS NULL
          OR public.is_superadmin(auth.uid())
          OR public.tenant_has_module(auth.uid(), %L)
        )
    $f$, t, m, m);
  END LOOP;
END $$;

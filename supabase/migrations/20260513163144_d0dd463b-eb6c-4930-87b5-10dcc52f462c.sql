DO $$
BEGIN
  PERFORM set_config('app.force_delete_tenant', 'true', true);
  ALTER TABLE public.sale_items DISABLE TRIGGER USER;
  ALTER TABLE public.purchase_items DISABLE TRIGGER USER;
  ALTER TABLE public.stock_adjustments DISABLE TRIGGER USER;
  ALTER TABLE public.stock_transfers DISABLE TRIGGER USER;
  DELETE FROM public.tenants WHERE id = 'df00a384-3cfe-49d4-ab41-a1e8dd11ef68';
  ALTER TABLE public.sale_items ENABLE TRIGGER USER;
  ALTER TABLE public.purchase_items ENABLE TRIGGER USER;
  ALTER TABLE public.stock_adjustments ENABLE TRIGGER USER;
  ALTER TABLE public.stock_transfers ENABLE TRIGGER USER;
END $$;
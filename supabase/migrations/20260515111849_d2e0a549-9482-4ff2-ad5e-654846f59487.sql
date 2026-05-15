ALTER TABLE public.warehouse_stock REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.warehouse_stock;
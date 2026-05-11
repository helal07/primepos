ALTER TABLE public.warehouse_stock
  ADD CONSTRAINT warehouse_stock_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE public.warehouse_stock
  ADD CONSTRAINT warehouse_stock_variation_id_fkey
  FOREIGN KEY (variation_id) REFERENCES public.product_variations(id) ON DELETE CASCADE;

NOTIFY pgrst, 'reload schema';

ALTER TABLE public.product_variations DROP CONSTRAINT IF EXISTS product_variations_product_id_fkey,
  ADD CONSTRAINT product_variations_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE public.warehouse_stock DROP CONSTRAINT IF EXISTS warehouse_stock_product_id_fkey,
  ADD CONSTRAINT warehouse_stock_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE public.stock_adjustments DROP CONSTRAINT IF EXISTS stock_adjustments_product_id_fkey,
  ADD CONSTRAINT stock_adjustments_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE public.stock_transfers DROP CONSTRAINT IF EXISTS stock_transfers_product_id_fkey,
  ADD CONSTRAINT stock_transfers_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE public.product_group_prices DROP CONSTRAINT IF EXISTS product_group_prices_product_id_fkey,
  ADD CONSTRAINT product_group_prices_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE public.store_collection_products DROP CONSTRAINT IF EXISTS store_collection_products_product_id_fkey,
  ADD CONSTRAINT store_collection_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE public.purchase_order_items DROP CONSTRAINT IF EXISTS purchase_order_items_product_id_fkey,
  ADD CONSTRAINT purchase_order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

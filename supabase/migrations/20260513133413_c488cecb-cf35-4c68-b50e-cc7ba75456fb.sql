ALTER TABLE public.sale_items
  DROP CONSTRAINT IF EXISTS sale_items_product_id_fkey,
  ADD CONSTRAINT sale_items_product_id_fkey
    FOREIGN KEY (product_id)
    REFERENCES public.products(id)
    ON DELETE NO ACTION
    DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE public.purchase_items
  DROP CONSTRAINT IF EXISTS purchase_items_product_id_fkey,
  ADD CONSTRAINT purchase_items_product_id_fkey
    FOREIGN KEY (product_id)
    REFERENCES public.products(id)
    ON DELETE NO ACTION
    DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE public.store_order_items
  DROP CONSTRAINT IF EXISTS store_order_items_product_id_fkey,
  ADD CONSTRAINT store_order_items_product_id_fkey
    FOREIGN KEY (product_id)
    REFERENCES public.products(id)
    ON DELETE NO ACTION
    DEFERRABLE INITIALLY DEFERRED;
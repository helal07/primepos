
-- Helper: upsert warehouse_stock delta
CREATE OR REPLACE FUNCTION public.apply_warehouse_stock_delta(
  _tenant_id uuid,
  _warehouse_id uuid,
  _product_id uuid,
  _variation_id uuid,
  _delta numeric
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wid uuid := _warehouse_id;
BEGIN
  IF _product_id IS NULL OR _delta = 0 THEN RETURN; END IF;
  IF wid IS NULL THEN
    wid := public.ensure_default_warehouse(_tenant_id);
  END IF;
  IF wid IS NULL THEN RETURN; END IF;

  INSERT INTO public.warehouse_stock (tenant_id, warehouse_id, product_id, variation_id, quantity)
  VALUES (_tenant_id, wid, _product_id, _variation_id, _delta)
  ON CONFLICT (warehouse_id, product_id, variation_id)
  DO UPDATE SET quantity = public.warehouse_stock.quantity + EXCLUDED.quantity,
                updated_at = now();
END; $$;

-- ===== purchase_items =====
CREATE OR REPLACE FUNCTION public.trg_purchase_items_warehouse_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  wid uuid;
  tid uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT warehouse_id, tenant_id INTO wid, tid FROM public.purchases WHERE id = NEW.purchase_id;
    PERFORM public.apply_warehouse_stock_delta(COALESCE(NEW.tenant_id, tid), wid, NEW.product_id, NEW.variation_id, NEW.quantity);
  ELSIF TG_OP = 'DELETE' THEN
    SELECT warehouse_id, tenant_id INTO wid, tid FROM public.purchases WHERE id = OLD.purchase_id;
    PERFORM public.apply_warehouse_stock_delta(COALESCE(OLD.tenant_id, tid), wid, OLD.product_id, OLD.variation_id, -OLD.quantity);
  END IF;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS purchase_items_warehouse_stock ON public.purchase_items;
CREATE TRIGGER purchase_items_warehouse_stock
AFTER INSERT OR DELETE ON public.purchase_items
FOR EACH ROW EXECUTE FUNCTION public.trg_purchase_items_warehouse_stock();

-- ===== sale_items =====
CREATE OR REPLACE FUNCTION public.trg_sale_items_warehouse_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  wid uuid;
  tid uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT warehouse_id, tenant_id INTO wid, tid FROM public.sales WHERE id = NEW.sale_id;
    PERFORM public.apply_warehouse_stock_delta(COALESCE(NEW.tenant_id, tid), wid, NEW.product_id, NEW.variation_id, -NEW.quantity);
  ELSIF TG_OP = 'DELETE' THEN
    SELECT warehouse_id, tenant_id INTO wid, tid FROM public.sales WHERE id = OLD.sale_id;
    PERFORM public.apply_warehouse_stock_delta(COALESCE(OLD.tenant_id, tid), wid, OLD.product_id, OLD.variation_id, OLD.quantity);
  END IF;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS sale_items_warehouse_stock ON public.sale_items;
CREATE TRIGGER sale_items_warehouse_stock
AFTER INSERT OR DELETE ON public.sale_items
FOR EACH ROW EXECUTE FUNCTION public.trg_sale_items_warehouse_stock();

-- ===== stock_adjustments =====
CREATE OR REPLACE FUNCTION public.trg_stock_adjustments_warehouse_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  delta numeric;
BEGIN
  IF TG_OP = 'INSERT' THEN
    delta := CASE WHEN NEW.type = 'addition' THEN NEW.quantity_change ELSE -NEW.quantity_change END;
    PERFORM public.apply_warehouse_stock_delta(NEW.tenant_id, NEW.warehouse_id, NEW.product_id, NEW.variation_id, delta);
  ELSIF TG_OP = 'DELETE' THEN
    delta := CASE WHEN OLD.type = 'addition' THEN -OLD.quantity_change ELSE OLD.quantity_change END;
    PERFORM public.apply_warehouse_stock_delta(OLD.tenant_id, OLD.warehouse_id, OLD.product_id, OLD.variation_id, delta);
  END IF;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS stock_adjustments_warehouse_stock ON public.stock_adjustments;
CREATE TRIGGER stock_adjustments_warehouse_stock
AFTER INSERT OR DELETE ON public.stock_adjustments
FOR EACH ROW EXECUTE FUNCTION public.trg_stock_adjustments_warehouse_stock();

-- ===== stock_transfers (apply on completion) =====
CREATE OR REPLACE FUNCTION public.trg_stock_transfers_warehouse_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'completed' THEN
      PERFORM public.apply_warehouse_stock_delta(NEW.tenant_id, NEW.from_warehouse_id, NEW.product_id, NEW.variation_id, -NEW.quantity);
      PERFORM public.apply_warehouse_stock_delta(NEW.tenant_id, NEW.to_warehouse_id, NEW.product_id, NEW.variation_id, NEW.quantity);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status <> 'completed' AND NEW.status = 'completed' THEN
      PERFORM public.apply_warehouse_stock_delta(NEW.tenant_id, NEW.from_warehouse_id, NEW.product_id, NEW.variation_id, -NEW.quantity);
      PERFORM public.apply_warehouse_stock_delta(NEW.tenant_id, NEW.to_warehouse_id, NEW.product_id, NEW.variation_id, NEW.quantity);
    ELSIF OLD.status = 'completed' AND NEW.status <> 'completed' THEN
      PERFORM public.apply_warehouse_stock_delta(OLD.tenant_id, OLD.from_warehouse_id, OLD.product_id, OLD.variation_id, OLD.quantity);
      PERFORM public.apply_warehouse_stock_delta(OLD.tenant_id, OLD.to_warehouse_id, OLD.product_id, OLD.variation_id, -OLD.quantity);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'completed' THEN
      PERFORM public.apply_warehouse_stock_delta(OLD.tenant_id, OLD.from_warehouse_id, OLD.product_id, OLD.variation_id, OLD.quantity);
      PERFORM public.apply_warehouse_stock_delta(OLD.tenant_id, OLD.to_warehouse_id, OLD.product_id, OLD.variation_id, -OLD.quantity);
    END IF;
  END IF;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS stock_transfers_warehouse_stock ON public.stock_transfers;
CREATE TRIGGER stock_transfers_warehouse_stock
AFTER INSERT OR UPDATE OR DELETE ON public.stock_transfers
FOR EACH ROW EXECUTE FUNCTION public.trg_stock_transfers_warehouse_stock();

-- ===== Backfill: seed default warehouse with current product stock_quantity =====
DO $$
DECLARE
  r record;
  wid uuid;
BEGIN
  FOR r IN
    SELECT p.id AS product_id, p.tenant_id, COALESCE(p.stock_quantity, 0) AS qty
    FROM public.products p
    WHERE p.tenant_id IS NOT NULL AND COALESCE(p.stock_quantity,0) <> 0
  LOOP
    wid := public.ensure_default_warehouse(r.tenant_id);
    IF wid IS NOT NULL THEN
      INSERT INTO public.warehouse_stock (tenant_id, warehouse_id, product_id, variation_id, quantity)
      VALUES (r.tenant_id, wid, r.product_id, NULL, r.qty)
      ON CONFLICT (warehouse_id, product_id, variation_id) DO NOTHING;
    END IF;
  END LOOP;

  FOR r IN
    SELECT v.id AS variation_id, v.product_id, v.tenant_id, COALESCE(v.stock_quantity, 0) AS qty
    FROM public.product_variations v
    WHERE v.tenant_id IS NOT NULL AND COALESCE(v.stock_quantity,0) <> 0
  LOOP
    wid := public.ensure_default_warehouse(r.tenant_id);
    IF wid IS NOT NULL THEN
      INSERT INTO public.warehouse_stock (tenant_id, warehouse_id, product_id, variation_id, quantity)
      VALUES (r.tenant_id, wid, r.product_id, r.variation_id, r.qty)
      ON CONFLICT (warehouse_id, product_id, variation_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;

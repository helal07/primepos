-- Cross-table IMEI/serial uniqueness enforcement (tenant-scoped, blocks new duplicates only)

CREATE OR REPLACE FUNCTION public.enforce_serial_unique_purchase_items()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.serial_number IS NULL OR NEW.serial_number = '' THEN
    RETURN NEW;
  END IF;

  -- Other purchase_items rows
  IF EXISTS (
    SELECT 1 FROM public.purchase_items
    WHERE serial_number = NEW.serial_number
      AND tenant_id IS NOT DISTINCT FROM NEW.tenant_id
      AND id <> NEW.id
  ) THEN
    RAISE EXCEPTION 'IMEI/Serial "%" already exists in purchases', NEW.serial_number
      USING ERRCODE = '23505';
  END IF;

  -- exchange_purchases
  IF EXISTS (
    SELECT 1 FROM public.exchange_purchases
    WHERE imei = NEW.serial_number
      AND tenant_id IS NOT DISTINCT FROM NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'IMEI/Serial "%" already exists in exchange stock', NEW.serial_number
      USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_purchase_items_serial_unique ON public.purchase_items;
CREATE TRIGGER trg_purchase_items_serial_unique
BEFORE INSERT OR UPDATE OF serial_number ON public.purchase_items
FOR EACH ROW EXECUTE FUNCTION public.enforce_serial_unique_purchase_items();

CREATE OR REPLACE FUNCTION public.enforce_imei_unique_exchange_purchases()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.imei IS NULL OR NEW.imei = '' THEN
    RETURN NEW;
  END IF;

  -- Other exchange rows
  IF EXISTS (
    SELECT 1 FROM public.exchange_purchases
    WHERE imei = NEW.imei
      AND tenant_id IS NOT DISTINCT FROM NEW.tenant_id
      AND id <> NEW.id
  ) THEN
    RAISE EXCEPTION 'IMEI "%" already exists in exchange stock', NEW.imei
      USING ERRCODE = '23505';
  END IF;

  -- purchase_items
  IF EXISTS (
    SELECT 1 FROM public.purchase_items
    WHERE serial_number = NEW.imei
      AND tenant_id IS NOT DISTINCT FROM NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'IMEI "%" already exists in purchases', NEW.imei
      USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_exchange_purchases_imei_unique ON public.exchange_purchases;
CREATE TRIGGER trg_exchange_purchases_imei_unique
BEFORE INSERT OR UPDATE OF imei ON public.exchange_purchases
FOR EACH ROW EXECUTE FUNCTION public.enforce_imei_unique_exchange_purchases();

CREATE INDEX IF NOT EXISTS idx_purchase_items_serial_number
  ON public.purchase_items (serial_number)
  WHERE serial_number IS NOT NULL AND serial_number <> '';
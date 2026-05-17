
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS due_amount numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.recalc_sale_payment_status(_sale_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric := 0;
  v_paid  numeric := 0;
  v_status text;
BEGIN
  IF _sale_id IS NULL THEN RETURN; END IF;
  SELECT COALESCE(total_amount, 0) INTO v_total FROM public.sales WHERE id = _sale_id;
  SELECT COALESCE(SUM(amount), 0) INTO v_paid FROM public.sale_payments WHERE sale_id = _sale_id;

  IF v_paid <= 0 THEN
    v_status := 'due';
  ELSIF v_paid >= v_total THEN
    v_status := 'paid';
  ELSE
    v_status := 'partial';
  END IF;

  UPDATE public.sales
     SET due_amount = (v_total - v_paid),
         payment_status = v_status,
         updated_at = now()
   WHERE id = _sale_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_sale_payments_recalc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_sale_payment_status(OLD.sale_id);
    RETURN OLD;
  ELSE
    PERFORM public.recalc_sale_payment_status(NEW.sale_id);
    IF TG_OP = 'UPDATE' AND NEW.sale_id IS DISTINCT FROM OLD.sale_id THEN
      PERFORM public.recalc_sale_payment_status(OLD.sale_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS sale_payments_recalc ON public.sale_payments;
CREATE TRIGGER sale_payments_recalc
AFTER INSERT OR UPDATE OR DELETE ON public.sale_payments
FOR EACH ROW EXECUTE FUNCTION public.trg_sale_payments_recalc();

CREATE OR REPLACE FUNCTION public.trg_sales_total_recalc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.total_amount IS DISTINCT FROM OLD.total_amount THEN
    PERFORM public.recalc_sale_payment_status(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sales_total_recalc ON public.sales;
CREATE TRIGGER sales_total_recalc
AFTER UPDATE OF total_amount ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.trg_sales_total_recalc();

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.sales LOOP
    PERFORM public.recalc_sale_payment_status(r.id);
  END LOOP;
END $$;

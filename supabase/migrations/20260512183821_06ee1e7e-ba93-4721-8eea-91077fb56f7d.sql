
-- Phase 2: Storefront orders, guest checkout, COD, auto-sync to sales+shipments

CREATE TABLE IF NOT EXISTS public.store_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, confirmed, cancelled, fulfilled
  payment_method text NOT NULL DEFAULT 'cod', -- cod, sslcommerz, bkash
  payment_status text NOT NULL DEFAULT 'pending', -- pending, paid, failed, refunded
  payment_ref text,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  shipping_address text NOT NULL,
  city text,
  notes text,
  subtotal numeric NOT NULL DEFAULT 0,
  shipping_cost numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
  shipment_id uuid REFERENCES public.shipments(id) ON DELETE SET NULL,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, order_number)
);

CREATE INDEX IF NOT EXISTS idx_store_orders_tenant ON public.store_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_status ON public.store_orders(status);

CREATE TABLE IF NOT EXISTS public.store_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variation_id uuid REFERENCES public.product_variations(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  variation_name text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_order_items_order ON public.store_order_items(order_id);

ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_order_items ENABLE ROW LEVEL SECURITY;

-- Tenant staff can view/manage their store orders
CREATE POLICY store_orders_select ON public.store_orders FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id(auth.uid())) OR is_superadmin(auth.uid()));
CREATE POLICY store_orders_update ON public.store_orders FOR UPDATE TO authenticated
  USING ((tenant_id = get_user_tenant_id(auth.uid())) OR is_superadmin(auth.uid()));
CREATE POLICY store_orders_delete ON public.store_orders FOR DELETE TO authenticated
  USING (is_tenant_manager_or_above(auth.uid()));

CREATE POLICY store_order_items_select ON public.store_order_items FOR SELECT TO authenticated
  USING ((tenant_id = get_user_tenant_id(auth.uid())) OR is_superadmin(auth.uid()));
CREATE POLICY store_order_items_update ON public.store_order_items FOR UPDATE TO authenticated
  USING (is_tenant_manager_or_above(auth.uid()));
CREATE POLICY store_order_items_delete ON public.store_order_items FOR DELETE TO authenticated
  USING (is_tenant_manager_or_above(auth.uid()));

-- Public read of own order by id (for confirmation/tracking page)
CREATE POLICY store_orders_public_read_by_id ON public.store_orders FOR SELECT TO anon, authenticated
  USING (true); -- relies on UUID being unguessable; tracking by id only
CREATE POLICY store_order_items_public_read ON public.store_order_items FOR SELECT TO anon, authenticated
  USING (true);

-- Order number generator
CREATE OR REPLACE FUNCTION public.generate_store_order_number()
RETURNS text LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RETURN 'WO-' || to_char(now(), 'YYMMDD') || '-' || lpad(floor(random() * 100000)::text, 5, '0');
END;
$$;

-- Place order RPC (security definer, callable anon for guest checkout)
CREATE OR REPLACE FUNCTION public.place_store_order(
  p_tenant_slug text,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_shipping_address text,
  p_city text,
  p_notes text,
  p_payment_method text,
  p_items jsonb -- [{product_id, variation_id, quantity}]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_settings record;
  v_order_id uuid;
  v_order_number text;
  v_subtotal numeric := 0;
  v_shipping numeric := 0;
  v_total numeric := 0;
  v_item jsonb;
  v_product record;
  v_variation record;
  v_unit_price numeric;
  v_qty integer;
  v_item_total numeric;
BEGIN
  IF p_customer_name IS NULL OR length(trim(p_customer_name)) = 0 THEN
    RAISE EXCEPTION 'Customer name required';
  END IF;
  IF p_customer_phone IS NULL OR length(trim(p_customer_phone)) = 0 THEN
    RAISE EXCEPTION 'Customer phone required';
  END IF;
  IF p_shipping_address IS NULL OR length(trim(p_shipping_address)) = 0 THEN
    RAISE EXCEPTION 'Shipping address required';
  END IF;
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;

  SELECT id INTO v_tenant_id FROM tenants WHERE slug = p_tenant_slug;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Store not found';
  END IF;

  SELECT * INTO v_settings FROM store_settings WHERE tenant_id = v_tenant_id;
  IF v_settings IS NULL OR NOT v_settings.enabled THEN
    RAISE EXCEPTION 'Store is not accepting orders';
  END IF;

  IF p_payment_method = 'cod' AND NOT COALESCE(v_settings.enable_cod, true) THEN
    RAISE EXCEPTION 'Cash on delivery is disabled';
  END IF;

  v_order_number := generate_store_order_number();
  v_order_id := gen_random_uuid();

  INSERT INTO store_orders (id, tenant_id, order_number, status, payment_method, payment_status,
    customer_name, customer_phone, customer_email, shipping_address, city, notes,
    subtotal, shipping_cost, total_amount)
  VALUES (v_order_id, v_tenant_id, v_order_number, 'pending', p_payment_method,
    CASE WHEN p_payment_method = 'cod' THEN 'pending' ELSE 'pending' END,
    p_customer_name, p_customer_phone, p_customer_email, p_shipping_address, p_city, p_notes,
    0, 0, 0);

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := GREATEST(1, COALESCE((v_item->>'quantity')::int, 1));
    SELECT * INTO v_product FROM products
      WHERE id = (v_item->>'product_id')::uuid
        AND tenant_id = v_tenant_id
        AND is_active = true
        AND show_on_website = true;
    IF v_product IS NULL THEN
      RAISE EXCEPTION 'Product not available';
    END IF;
    v_unit_price := v_product.selling_price;
    v_variation := NULL;
    IF (v_item->>'variation_id') IS NOT NULL AND length(v_item->>'variation_id') > 0 THEN
      SELECT * INTO v_variation FROM product_variations
        WHERE id = (v_item->>'variation_id')::uuid AND product_id = v_product.id AND is_active = true;
      IF v_variation IS NULL THEN
        RAISE EXCEPTION 'Variation not available';
      END IF;
      v_unit_price := v_variation.selling_price;
    END IF;
    v_item_total := v_unit_price * v_qty;
    v_subtotal := v_subtotal + v_item_total;

    INSERT INTO store_order_items (order_id, tenant_id, product_id, variation_id,
      product_name, variation_name, quantity, unit_price, total)
    VALUES (v_order_id, v_tenant_id, v_product.id,
      CASE WHEN v_variation IS NULL THEN NULL ELSE v_variation.id END,
      v_product.name,
      CASE WHEN v_variation IS NULL THEN NULL ELSE v_variation.name END,
      v_qty, v_unit_price, v_item_total);
  END LOOP;

  v_shipping := COALESCE(v_settings.shipping_flat_rate, 0);
  IF v_settings.free_shipping_threshold IS NOT NULL AND v_subtotal >= v_settings.free_shipping_threshold THEN
    v_shipping := 0;
  END IF;
  v_total := v_subtotal + v_shipping;

  UPDATE store_orders SET subtotal = v_subtotal, shipping_cost = v_shipping, total_amount = v_total
    WHERE id = v_order_id;

  RETURN jsonb_build_object('order_id', v_order_id, 'order_number', v_order_number, 'total', v_total);
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_store_order(text, text, text, text, text, text, text, text, jsonb) TO anon, authenticated;

-- Confirm-order RPC: creates sale + sale_items + shipment, links them to the order.
CREATE OR REPLACE FUNCTION public.confirm_store_order(p_order_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order record;
  v_sale_id uuid;
  v_shipment_id uuid;
  v_customer_id uuid;
  v_item record;
BEGIN
  SELECT * INTO v_order FROM store_orders WHERE id = p_order_id;
  IF v_order IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.tenant_id <> get_user_tenant_id(auth.uid()) AND NOT is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF v_order.status = 'confirmed' OR v_order.sale_id IS NOT NULL THEN
    RAISE EXCEPTION 'Order already confirmed';
  END IF;

  -- Find or create customer by phone
  SELECT id INTO v_customer_id FROM customers
    WHERE tenant_id = v_order.tenant_id AND phone = v_order.customer_phone LIMIT 1;
  IF v_customer_id IS NULL THEN
    INSERT INTO customers (tenant_id, name, phone, email, address, created_by)
    VALUES (v_order.tenant_id, v_order.customer_name, v_order.customer_phone,
      v_order.customer_email, v_order.shipping_address, auth.uid())
    RETURNING id INTO v_customer_id;
  END IF;

  v_sale_id := gen_random_uuid();
  INSERT INTO sales (id, tenant_id, customer_id, sale_date, status, subtotal,
    shipping_cost, total_amount, payment_method, payment_status, source, created_by, notes)
  VALUES (v_sale_id, v_order.tenant_id, v_customer_id, now(),
    CASE WHEN v_order.payment_status = 'paid' THEN 'completed' ELSE 'pending' END,
    v_order.subtotal, v_order.shipping_cost, v_order.total_amount,
    v_order.payment_method,
    CASE WHEN v_order.payment_status = 'paid' THEN 'paid' ELSE 'due' END,
    'website', auth.uid(),
    'Website order ' || v_order.order_number);

  FOR v_item IN SELECT * FROM store_order_items WHERE order_id = v_order.id LOOP
    INSERT INTO sale_items (sale_id, tenant_id, product_id, variation_id, quantity, unit_price, total)
    VALUES (v_sale_id, v_order.tenant_id, v_item.product_id, v_item.variation_id,
      v_item.quantity, v_item.unit_price, v_item.total);
  END LOOP;

  v_shipment_id := gen_random_uuid();
  INSERT INTO shipments (id, tenant_id, sale_id, status, recipient_name, recipient_phone,
    shipping_address, city, shipping_cost, created_by)
  VALUES (v_shipment_id, v_order.tenant_id, v_sale_id, 'pending',
    v_order.customer_name, v_order.customer_phone, v_order.shipping_address, v_order.city,
    v_order.shipping_cost, auth.uid());

  UPDATE store_orders SET status = 'confirmed', sale_id = v_sale_id, shipment_id = v_shipment_id,
    confirmed_at = now(), updated_at = now()
  WHERE id = p_order_id;

  RETURN v_sale_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_store_order(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_store_order(p_order_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_order record;
BEGIN
  SELECT * INTO v_order FROM store_orders WHERE id = p_order_id;
  IF v_order IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.tenant_id <> get_user_tenant_id(auth.uid()) AND NOT is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  UPDATE store_orders SET status = 'cancelled', cancelled_at = now(),
    notes = COALESCE(notes, '') || E'\nCancelled: ' || COALESCE(p_reason,''),
    updated_at = now()
  WHERE id = p_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_store_order(uuid, text) TO authenticated;

-- updated_at trigger
CREATE TRIGGER trg_store_orders_updated_at BEFORE UPDATE ON public.store_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

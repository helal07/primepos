
-- Sequence for installment invoice numbers
CREATE SEQUENCE public.installment_invoice_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_installment_invoice()
RETURNS text
LANGUAGE sql
SET search_path = public
AS $$
  SELECT 'INS-' || lpad(nextval('public.installment_invoice_seq')::text, 6, '0')
$$;

-- 1. installment_customers
CREATE TABLE public.installment_customers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  permanent_address text,
  work_address text,
  nid_url text,
  photo_url text,
  guarantor_name text,
  guarantor_mobile text,
  guarantor_present_address text,
  guarantor_permanent_address text,
  guarantor_work_address text,
  guarantor_nid_url text,
  guarantor_photo_url text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.installment_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ic_select" ON public.installment_customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "ic_insert" ON public.installment_customers FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "ic_update" ON public.installment_customers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "ic_delete" ON public.installment_customers FOR DELETE TO authenticated USING (is_tenant_manager_or_above(auth.uid()));

-- 2. installment_sales
CREATE TABLE public.installment_sales (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_no text NOT NULL DEFAULT generate_installment_invoice(),
  sale_date date NOT NULL DEFAULT CURRENT_DATE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  installment_customer_id uuid REFERENCES public.installment_customers(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  variation_id uuid REFERENCES public.product_variations(id) ON DELETE SET NULL,
  imei_serial text,
  price numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  interest_percent numeric NOT NULL DEFAULT 0,
  shipping_cost numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  down_payment numeric NOT NULL DEFAULT 0,
  down_payment_account text NOT NULL DEFAULT 'cash',
  remaining_amount numeric NOT NULL DEFAULT 0,
  num_installments integer NOT NULL DEFAULT 1,
  installment_duration_days integer NOT NULL DEFAULT 30,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.installment_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "is_select" ON public.installment_sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "is_insert" ON public.installment_sales FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "is_update" ON public.installment_sales FOR UPDATE TO authenticated USING (true);
CREATE POLICY "is_delete" ON public.installment_sales FOR DELETE TO authenticated USING (is_tenant_manager_or_above(auth.uid()));

-- 3. installment_schedules
CREATE TABLE public.installment_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  installment_sale_id uuid NOT NULL REFERENCES public.installment_sales(id) ON DELETE CASCADE,
  serial_no integer NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  paid_amount numeric NOT NULL DEFAULT 0,
  paid_date date,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.installment_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "isch_select" ON public.installment_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "isch_insert" ON public.installment_schedules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "isch_update" ON public.installment_schedules FOR UPDATE TO authenticated USING (true);
CREATE POLICY "isch_delete" ON public.installment_schedules FOR DELETE TO authenticated USING (true);

-- 4. installment_collections
CREATE TABLE public.installment_collections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  installment_sale_id uuid NOT NULL REFERENCES public.installment_sales(id) ON DELETE CASCADE,
  schedule_id uuid NOT NULL REFERENCES public.installment_schedules(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  collected_by uuid,
  collected_at timestamptz NOT NULL DEFAULT now(),
  notes text
);
ALTER TABLE public.installment_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "icol_select" ON public.installment_collections FOR SELECT TO authenticated USING (true);
CREATE POLICY "icol_insert" ON public.installment_collections FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "icol_update" ON public.installment_collections FOR UPDATE TO authenticated USING (true);
CREATE POLICY "icol_delete" ON public.installment_collections FOR DELETE TO authenticated USING (is_tenant_manager_or_above(auth.uid()));

-- 5. Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('installment-docs', 'installment-docs', true);

CREATE POLICY "installment_docs_select" ON storage.objects FOR SELECT USING (bucket_id = 'installment-docs');
CREATE POLICY "installment_docs_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'installment-docs' AND auth.role() = 'authenticated');
CREATE POLICY "installment_docs_update" ON storage.objects FOR UPDATE USING (bucket_id = 'installment-docs' AND auth.role() = 'authenticated');
CREATE POLICY "installment_docs_delete" ON storage.objects FOR DELETE USING (bucket_id = 'installment-docs' AND auth.role() = 'authenticated');

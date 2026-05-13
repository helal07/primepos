-- Add Ultimate POS-style Sales Order fields
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS pay_term_number integer,
  ADD COLUMN IF NOT EXISTS pay_term_unit text,
  ADD COLUMN IF NOT EXISTS order_no text,
  ADD COLUMN IF NOT EXISTS attach_document_url text,
  ADD COLUMN IF NOT EXISTS shipping_details text,
  ADD COLUMN IF NOT EXISTS shipping_address text,
  ADD COLUMN IF NOT EXISTS shipping_status text,
  ADD COLUMN IF NOT EXISTS delivered_to text,
  ADD COLUMN IF NOT EXISTS delivery_person_id uuid,
  ADD COLUMN IF NOT EXISTS shipping_documents_url text,
  ADD COLUMN IF NOT EXISTS additional_expenses jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.sale_items
  ADD COLUMN IF NOT EXISTS warranty_id uuid,
  ADD COLUMN IF NOT EXISTS warranty_name text,
  ADD COLUMN IF NOT EXISTS imei_text text,
  ADD COLUMN IF NOT EXISTS discount_type text DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS unit text;

-- Soft FK to warranties (nullable)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sale_items_warranty_id_fkey'
  ) THEN
    ALTER TABLE public.sale_items
      ADD CONSTRAINT sale_items_warranty_id_fkey
      FOREIGN KEY (warranty_id) REFERENCES public.warranties(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sales_delivery_person_id_fkey'
  ) THEN
    ALTER TABLE public.sales
      ADD CONSTRAINT sales_delivery_person_id_fkey
      FOREIGN KEY (delivery_person_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;
  END IF;
END $$;
-- Expenses module
CREATE TABLE public.expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  parent_id uuid REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS public.expense_reference_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_expense_reference()
RETURNS text LANGUAGE sql SET search_path = public AS $$
  SELECT 'EP' || to_char(now(),'YY') || '/' || lpad(nextval('public.expense_reference_seq')::text, 4, '0')
$$;

CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  reference_no text NOT NULL DEFAULT public.generate_expense_reference(),
  expense_date timestamptz NOT NULL DEFAULT now(),
  category_id uuid REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  sub_category_id uuid REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  location_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  payment_status text NOT NULL DEFAULT 'paid',
  payment_method text,
  tax_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  payment_due numeric NOT NULL DEFAULT 0,
  contact_id uuid,
  contact_name text,
  expense_for_user_id uuid,
  expense_note text,
  recurring boolean NOT NULL DEFAULT false,
  recurring_interval text,
  recurring_repetitions integer,
  attachment_url text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_tenant_date ON public.expenses(tenant_id, expense_date DESC);
CREATE INDEX idx_expenses_category ON public.expenses(category_id);

CREATE TABLE public.expense_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  paid_on timestamptz NOT NULL DEFAULT now(),
  method text,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_expense_payments_expense ON public.expense_payments(expense_id);

-- Triggers: tenant_id + updated_at
CREATE TRIGGER set_tenant_id_expense_categories BEFORE INSERT ON public.expense_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_expenses BEFORE INSERT ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_expense_payments BEFORE INSERT ON public.expense_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER touch_expense_categories BEFORE UPDATE ON public.expense_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER touch_expenses BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sync to transactions table for accounting
CREATE OR REPLACE FUNCTION public.sync_expense_to_transactions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP IN ('INSERT','UPDATE') THEN
    DELETE FROM public.transactions WHERE reference = NEW.reference_no AND type = 'expense';
    IF NEW.account_id IS NOT NULL THEN
      INSERT INTO public.transactions (transaction_date, description, reference, type, account_id, debit, credit, created_by, tenant_id)
      VALUES (NEW.expense_date::date, COALESCE(NEW.expense_note, NEW.reference_no), NEW.reference_no, 'expense', NEW.account_id, NEW.total_amount, 0, NEW.created_by, NEW.tenant_id);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.transactions WHERE reference = OLD.reference_no AND type = 'expense';
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$;

CREATE TRIGGER sync_expense_txn AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.sync_expense_to_transactions();

-- RLS
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select_expense_categories" ON public.expense_categories FOR SELECT
  USING (public.is_superadmin(auth.uid()) OR tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_modify_expense_categories" ON public.expense_categories FOR ALL
  USING (public.is_superadmin(auth.uid()) OR tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()) OR tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "tenant_select_expenses" ON public.expenses FOR SELECT
  USING (public.is_superadmin(auth.uid()) OR tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_modify_expenses" ON public.expenses FOR ALL
  USING (public.is_superadmin(auth.uid()) OR tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()) OR tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "tenant_select_expense_payments" ON public.expense_payments FOR SELECT
  USING (public.is_superadmin(auth.uid()) OR tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_modify_expense_payments" ON public.expense_payments FOR ALL
  USING (public.is_superadmin(auth.uid()) OR tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()) OR tenant_id = public.get_user_tenant_id(auth.uid()));

-- Storage bucket for attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('expense-attachments','expense-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "expense_attachments_tenant_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'expense-attachments' AND (public.is_superadmin(auth.uid()) OR (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text));
CREATE POLICY "expense_attachments_tenant_write" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'expense-attachments' AND (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text);
CREATE POLICY "expense_attachments_tenant_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'expense-attachments' AND (public.is_superadmin(auth.uid()) OR (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text));
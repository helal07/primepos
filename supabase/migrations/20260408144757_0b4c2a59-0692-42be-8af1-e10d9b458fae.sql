
-- Chart of Accounts
CREATE TABLE public.accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'asset',
  parent_id UUID REFERENCES public.accounts(id),
  balance NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounts_select" ON public.accounts FOR SELECT TO authenticated USING (public.has_module_permission(auth.uid(), 'accounting', 'view'));
CREATE POLICY "accounts_insert" ON public.accounts FOR INSERT TO authenticated WITH CHECK (public.has_module_permission(auth.uid(), 'accounting', 'create'));
CREATE POLICY "accounts_update" ON public.accounts FOR UPDATE TO authenticated USING (public.has_module_permission(auth.uid(), 'accounting', 'edit'));
CREATE POLICY "accounts_delete" ON public.accounts FOR DELETE TO authenticated USING (public.has_module_permission(auth.uid(), 'accounting', 'delete'));

-- Journal Entries
CREATE TABLE public.journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference TEXT NOT NULL DEFAULT '',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "je_select" ON public.journal_entries FOR SELECT TO authenticated USING (public.has_module_permission(auth.uid(), 'accounting', 'view'));
CREATE POLICY "je_insert" ON public.journal_entries FOR INSERT TO authenticated WITH CHECK (public.has_module_permission(auth.uid(), 'accounting', 'create'));
CREATE POLICY "je_update" ON public.journal_entries FOR UPDATE TO authenticated USING (public.has_module_permission(auth.uid(), 'accounting', 'edit'));
CREATE POLICY "je_delete" ON public.journal_entries FOR DELETE TO authenticated USING (public.has_module_permission(auth.uid(), 'accounting', 'delete'));

-- Journal Entry Lines
CREATE TABLE public.journal_entry_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id),
  debit NUMERIC NOT NULL DEFAULT 0,
  credit NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jel_select" ON public.journal_entry_lines FOR SELECT TO authenticated USING (public.has_module_permission(auth.uid(), 'accounting', 'view'));
CREATE POLICY "jel_insert" ON public.journal_entry_lines FOR INSERT TO authenticated WITH CHECK (public.has_module_permission(auth.uid(), 'accounting', 'create'));
CREATE POLICY "jel_update" ON public.journal_entry_lines FOR UPDATE TO authenticated USING (public.has_module_permission(auth.uid(), 'accounting', 'edit'));
CREATE POLICY "jel_delete" ON public.journal_entry_lines FOR DELETE TO authenticated USING (public.has_module_permission(auth.uid(), 'accounting', 'delete'));

-- Transactions (ledger view)
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  reference TEXT,
  type TEXT NOT NULL DEFAULT 'journal',
  account_id UUID NOT NULL REFERENCES public.accounts(id),
  debit NUMERIC NOT NULL DEFAULT 0,
  credit NUMERIC NOT NULL DEFAULT 0,
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "txn_select" ON public.transactions FOR SELECT TO authenticated USING (public.has_module_permission(auth.uid(), 'accounting', 'view'));
CREATE POLICY "txn_insert" ON public.transactions FOR INSERT TO authenticated WITH CHECK (public.has_module_permission(auth.uid(), 'accounting', 'create'));
CREATE POLICY "txn_update" ON public.transactions FOR UPDATE TO authenticated USING (public.has_module_permission(auth.uid(), 'accounting', 'edit'));
CREATE POLICY "txn_delete" ON public.transactions FOR DELETE TO authenticated USING (public.has_module_permission(auth.uid(), 'accounting', 'delete'));

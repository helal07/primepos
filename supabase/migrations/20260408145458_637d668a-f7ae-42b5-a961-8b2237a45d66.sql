
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  designation TEXT,
  department TEXT,
  joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
  salary NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  emergency_contact TEXT,
  address TEXT,
  bank_name TEXT,
  bank_account TEXT,
  avatar_url TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employees_select" ON public.employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "employees_insert" ON public.employees FOR INSERT TO authenticated WITH CHECK (public.has_module_permission(auth.uid(), 'hrm', 'can_create'));
CREATE POLICY "employees_update" ON public.employees FOR UPDATE TO authenticated USING (public.has_module_permission(auth.uid(), 'hrm', 'can_edit'));
CREATE POLICY "employees_delete" ON public.employees FOR DELETE TO authenticated USING (public.has_module_permission(auth.uid(), 'hrm', 'can_delete'));

CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'present',
  latitude NUMERIC,
  longitude NUMERIC,
  selfie_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, date)
);
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attendance_select" ON public.attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "attendance_insert" ON public.attendance FOR INSERT TO authenticated WITH CHECK (public.has_module_permission(auth.uid(), 'hrm', 'can_create'));
CREATE POLICY "attendance_update" ON public.attendance FOR UPDATE TO authenticated USING (public.has_module_permission(auth.uid(), 'hrm', 'can_edit'));
CREATE POLICY "attendance_delete" ON public.attendance FOR DELETE TO authenticated USING (public.has_module_permission(auth.uid(), 'hrm', 'can_delete'));

CREATE TABLE public.leave_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL DEFAULT 'casual',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days NUMERIC NOT NULL DEFAULT 1,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leave_select" ON public.leave_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "leave_insert" ON public.leave_requests FOR INSERT TO authenticated WITH CHECK (public.has_module_permission(auth.uid(), 'hrm', 'can_create'));
CREATE POLICY "leave_update" ON public.leave_requests FOR UPDATE TO authenticated USING (public.has_module_permission(auth.uid(), 'hrm', 'can_edit'));
CREATE POLICY "leave_delete" ON public.leave_requests FOR DELETE TO authenticated USING (public.has_module_permission(auth.uid(), 'hrm', 'can_delete'));

CREATE TABLE public.payroll (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  basic_salary NUMERIC NOT NULL DEFAULT 0,
  allowances NUMERIC NOT NULL DEFAULT 0,
  deductions NUMERIC NOT NULL DEFAULT 0,
  overtime NUMERIC NOT NULL DEFAULT 0,
  net_salary NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  paid_date DATE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, month, year)
);
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payroll_select" ON public.payroll FOR SELECT TO authenticated USING (true);
CREATE POLICY "payroll_insert" ON public.payroll FOR INSERT TO authenticated WITH CHECK (public.has_module_permission(auth.uid(), 'hrm', 'can_create'));
CREATE POLICY "payroll_update" ON public.payroll FOR UPDATE TO authenticated USING (public.has_module_permission(auth.uid(), 'hrm', 'can_edit'));
CREATE POLICY "payroll_delete" ON public.payroll FOR DELETE TO authenticated USING (public.has_module_permission(auth.uid(), 'hrm', 'can_delete'));

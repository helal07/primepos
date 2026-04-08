
-- Step 1: Drop existing RLS policies on user_roles that reference has_role
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

-- Step 2: Drop old has_role function
DROP FUNCTION IF EXISTS public.has_role(UUID, app_role);

-- Step 3: Create roles table
CREATE TABLE public.roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Step 4: Create role_permissions table
CREATE TABLE public.role_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT false,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(role_id, module)
);
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Step 5: Create activity_log table
CREATE TABLE public.activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  module TEXT,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Step 6: Seed system roles
INSERT INTO public.roles (name, description, is_system) VALUES
  ('Superadmin', 'Full unrestricted access to all modules and settings', true),
  ('Tenant Manager', 'Can manage users, create custom roles, and configure settings', true),
  ('Staff', 'Default staff role with basic access', false);

-- Step 7: Add role_id to user_roles and migrate data
ALTER TABLE public.user_roles ADD COLUMN role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE;

UPDATE public.user_roles SET role_id = (SELECT id FROM public.roles WHERE name = 'Superadmin') WHERE role = 'admin';
UPDATE public.user_roles SET role_id = (SELECT id FROM public.roles WHERE name = 'Tenant Manager') WHERE role = 'manager';
UPDATE public.user_roles SET role_id = (SELECT id FROM public.roles WHERE name = 'Staff') WHERE role = 'user';
UPDATE public.user_roles SET role_id = (SELECT id FROM public.roles WHERE name = 'Staff') WHERE role_id IS NULL;

ALTER TABLE public.user_roles ALTER COLUMN role_id SET NOT NULL;
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
ALTER TABLE public.user_roles DROP COLUMN role;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_id_key UNIQUE (user_id, role_id);

-- Step 8: Drop old enum type
DROP TYPE IF EXISTS public.app_role;

-- Step 9: Security definer functions
CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (
  SELECT 1 FROM public.user_roles ur JOIN public.roles r ON ur.role_id = r.id
  WHERE ur.user_id = _user_id AND r.name = 'Superadmin'
) $$;

CREATE OR REPLACE FUNCTION public.is_tenant_manager_or_above(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (
  SELECT 1 FROM public.user_roles ur JOIN public.roles r ON ur.role_id = r.id
  WHERE ur.user_id = _user_id AND r.name IN ('Superadmin', 'Tenant Manager')
) $$;

CREATE OR REPLACE FUNCTION public.has_module_permission(_user_id UUID, _module TEXT, _permission TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_superadmin(_user_id) OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role_id = rp.role_id
    WHERE ur.user_id = _user_id AND rp.module = _module
      AND CASE _permission
        WHEN 'view' THEN rp.can_view
        WHEN 'create' THEN rp.can_create
        WHEN 'edit' THEN rp.can_edit
        WHEN 'delete' THEN rp.can_delete
        ELSE false END
  )
$$;

-- Step 10: Update handle_new_user for new role system
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  INSERT INTO public.user_roles (user_id, role_id)
  VALUES (NEW.id, (SELECT id FROM public.roles WHERE name = 'Staff'));
  RETURN NEW;
END;
$$;

-- Step 11: RLS for roles
CREATE POLICY "Authenticated can view roles" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can create roles" ON public.roles FOR INSERT TO authenticated WITH CHECK (public.is_tenant_manager_or_above(auth.uid()) AND NOT is_system);
CREATE POLICY "Managers can update roles" ON public.roles FOR UPDATE TO authenticated USING (public.is_tenant_manager_or_above(auth.uid()) AND NOT is_system);
CREATE POLICY "Managers can delete roles" ON public.roles FOR DELETE TO authenticated USING (public.is_tenant_manager_or_above(auth.uid()) AND NOT is_system);

-- Step 12: RLS for role_permissions
CREATE POLICY "Authenticated can view permissions" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can manage permissions" ON public.role_permissions FOR INSERT TO authenticated WITH CHECK (public.is_tenant_manager_or_above(auth.uid()));
CREATE POLICY "Managers can update permissions" ON public.role_permissions FOR UPDATE TO authenticated USING (public.is_tenant_manager_or_above(auth.uid()));
CREATE POLICY "Managers can delete permissions" ON public.role_permissions FOR DELETE TO authenticated USING (public.is_tenant_manager_or_above(auth.uid()));

-- Step 13: New RLS for user_roles
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Managers can view all user roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_tenant_manager_or_above(auth.uid()));
CREATE POLICY "Managers can assign roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.is_tenant_manager_or_above(auth.uid()));
CREATE POLICY "Managers can update user roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.is_tenant_manager_or_above(auth.uid()));
CREATE POLICY "Managers can remove user roles" ON public.user_roles FOR DELETE TO authenticated USING (public.is_tenant_manager_or_above(auth.uid()));

-- Step 14: RLS for activity_log
CREATE POLICY "Superadmins can view all logs" ON public.activity_log FOR SELECT TO authenticated USING (public.is_superadmin(auth.uid()));
CREATE POLICY "Users can view own logs" ON public.activity_log FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Authenticated can insert logs" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (true);

-- Step 15: Triggers
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON public.roles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Step 16: Seed permissions for Tenant Manager (full access to most modules)
INSERT INTO public.role_permissions (role_id, module, can_view, can_create, can_edit, can_delete)
SELECT r.id, m.module, true, true, true, true
FROM public.roles r
CROSS JOIN (VALUES 
  ('dashboard'), ('products'), ('categories'), ('brands'), ('units'),
  ('sales'), ('pos'), ('purchases'), ('customers'), ('suppliers'),
  ('accounting'), ('hrm'), ('warranty'), ('cms'), ('settings'), ('users'), ('roles')
) AS m(module)
WHERE r.name = 'Tenant Manager';

-- Seed permissions for Staff (limited access)
INSERT INTO public.role_permissions (role_id, module, can_view, can_create, can_edit, can_delete)
SELECT r.id, m.module, 
  true, 
  m.module NOT IN ('settings', 'users', 'roles', 'accounting'),
  m.module NOT IN ('settings', 'users', 'roles', 'accounting'),
  false
FROM public.roles r
CROSS JOIN (VALUES 
  ('dashboard'), ('products'), ('categories'), ('brands'), ('units'),
  ('sales'), ('pos'), ('purchases'), ('customers'), ('suppliers'),
  ('accounting'), ('settings'), ('users'), ('roles')
) AS m(module)
WHERE r.name = 'Staff';

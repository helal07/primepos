
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS domain text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS db_name text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS company_name text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS subscription_type text NOT NULL DEFAULT 'monthly';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

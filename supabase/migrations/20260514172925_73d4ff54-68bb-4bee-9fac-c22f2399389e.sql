
create table if not exists public.trial_reminders_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  days_marker int not null,
  email text,
  status text not null default 'sent',
  error text,
  sent_at timestamptz not null default now(),
  unique(tenant_id, days_marker)
);
alter table public.trial_reminders_log enable row level security;
create policy "superadmin read trial reminders" on public.trial_reminders_log
  for select using (public.is_superadmin(auth.uid()));
create policy "service insert trial reminders" on public.trial_reminders_log
  for insert with check (true);

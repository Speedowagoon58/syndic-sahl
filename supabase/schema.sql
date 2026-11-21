-- SyndicSahl — Production-hardened Supabase PostgreSQL schema & RLS policies
-- Compatible with Moroccan copropriété workflows (Loi 18-00 / 106-12).
-- Note on public resident portal (/r/[slug]):
--   Private tables are NOT exposed to `anon` via RLS. Serve the read-only portal
--   through a Next.js Route Handler using SUPABASE_SERVICE_ROLE_KEY that checks
--   `share_pin`, never returns resident `phone` numbers, and masks `resident_name`
--   whenever `show_names_publicly = false`.

create extension if not exists pgcrypto;

-- 1. Buildings
create table if not exists public.buildings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  city text not null default '',
  default_monthly_fee numeric(12, 2) not null default 200 check (default_monthly_fee >= 0),
  opening_balance numeric(12, 2) not null default 0,
  start_month text not null check (start_month ~ '^\d{4}-\d{2}$'),
  rib text not null default '',
  share_slug text not null unique,
  share_pin text not null default '' check (share_pin = '' or share_pin ~ '^\d{4}$'),
  show_names_publicly boolean not null default false,
  plan_status text not null default 'trial' check (plan_status in ('trial', 'active', 'expired')),
  trial_ends_at timestamptz not null default (now() + interval '30 days'),
  plan_expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists buildings_owner_id_idx on public.buildings(owner_id);
create index if not exists buildings_share_slug_idx on public.buildings(share_slug);

-- 2. Apartments / Lots
create table if not exists public.apartments (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  unit_label text not null,
  resident_name text not null default '',
  phone text not null default '',
  monthly_fee numeric(12, 2) not null check (monthly_fee >= 0),
  active boolean not null default true,
  sort_order integer not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists apartments_building_id_idx on public.apartments(building_id, sort_order);

-- 3. Monthly Cotisation Payments
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  apartment_id uuid not null references public.apartments(id) on delete cascade,
  month_key text not null check (month_key ~ '^\d{4}-\d{2}$'),
  amount numeric(12, 2) not null check (amount > 0),
  method text not null check (method in ('cash', 'virement', 'cheque')),
  receipt_number text not null,
  note text not null default '',
  paid_at timestamptz not null default now(),
  constraint payments_apartment_month_unique unique (apartment_id, month_key)
);

create index if not exists payments_building_month_idx on public.payments(building_id, month_key);
create index if not exists payments_apartment_id_idx on public.payments(apartment_id);

-- 4. Building Expenses & Receipt Photos
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  category text not null check (category in ('gardiennage', 'eau_electricite', 'ascenseur', 'nettoyage', 'reparation', 'autre')),
  amount numeric(12, 2) not null check (amount > 0),
  expense_date date not null default current_date,
  description text not null,
  receipt_photo_path text,
  created_at timestamptz not null default now()
);

create index if not exists expenses_building_date_idx on public.expenses(building_id, expense_date desc);

-- 5. Subscription Requests (Virement / CashPlus activation queue)
create table if not exists public.subscription_requests (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  reference_code text not null,
  plan text not null check (plan in ('semi_annual', 'annual')),
  amount_mad numeric(12, 2) not null check (amount_mad > 0),
  channel text not null check (channel in ('virement', 'cashplus')),
  proof_photo_path text,
  note text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists subscription_requests_building_idx on public.subscription_requests(building_id);
create index if not exists subscription_requests_status_idx on public.subscription_requests(status, created_at desc);

-- Enable Row Level Security on all tables
alter table public.buildings enable row level security;
alter table public.apartments enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;
alter table public.subscription_requests enable row level security;

-- Owner-scoped policies (strictly TO authenticated, using (select auth.uid()))
create policy "buildings_select_own"
  on public.buildings for select
  to authenticated
  using ( (select auth.uid()) = owner_id );

create policy "buildings_insert_own"
  on public.buildings for insert
  to authenticated
  with check ( (select auth.uid()) = owner_id );

create policy "buildings_update_own"
  on public.buildings for update
  to authenticated
  using ( (select auth.uid()) = owner_id )
  with check ( (select auth.uid()) = owner_id );

create policy "buildings_delete_own"
  on public.buildings for delete
  to authenticated
  using ( (select auth.uid()) = owner_id );

-- Apartments policies
create policy "apartments_select_own"
  on public.apartments for select
  to authenticated
  using (
    exists (
      select 1 from public.buildings b
      where b.id = building_id and b.owner_id = (select auth.uid())
    )
  );

create policy "apartments_insert_own"
  on public.apartments for insert
  to authenticated
  with check (
    exists (
      select 1 from public.buildings b
      where b.id = building_id and b.owner_id = (select auth.uid())
    )
  );

create policy "apartments_update_own"
  on public.apartments for update
  to authenticated
  using (
    exists (
      select 1 from public.buildings b
      where b.id = building_id and b.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.buildings b
      where b.id = building_id and b.owner_id = (select auth.uid())
    )
  );

create policy "apartments_delete_own"
  on public.apartments for delete
  to authenticated
  using (
    exists (
      select 1 from public.buildings b
      where b.id = building_id and b.owner_id = (select auth.uid())
    )
  );

-- Payments policies
create policy "payments_select_own"
  on public.payments for select
  to authenticated
  using (
    exists (
      select 1 from public.buildings b
      where b.id = building_id and b.owner_id = (select auth.uid())
    )
  );

create policy "payments_insert_own"
  on public.payments for insert
  to authenticated
  with check (
    exists (
      select 1 from public.buildings b
      where b.id = building_id and b.owner_id = (select auth.uid())
    )
  );

create policy "payments_update_own"
  on public.payments for update
  to authenticated
  using (
    exists (
      select 1 from public.buildings b
      where b.id = building_id and b.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.buildings b
      where b.id = building_id and b.owner_id = (select auth.uid())
    )
  );

create policy "payments_delete_own"
  on public.payments for delete
  to authenticated
  using (
    exists (
      select 1 from public.buildings b
      where b.id = building_id and b.owner_id = (select auth.uid())
    )
  );

-- Expenses policies
create policy "expenses_select_own"
  on public.expenses for select
  to authenticated
  using (
    exists (
      select 1 from public.buildings b
      where b.id = building_id and b.owner_id = (select auth.uid())
    )
  );

create policy "expenses_insert_own"
  on public.expenses for insert
  to authenticated
  with check (
    exists (
      select 1 from public.buildings b
      where b.id = building_id and b.owner_id = (select auth.uid())
    )
  );

create policy "expenses_update_own"
  on public.expenses for update
  to authenticated
  using (
    exists (
      select 1 from public.buildings b
      where b.id = building_id and b.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.buildings b
      where b.id = building_id and b.owner_id = (select auth.uid())
    )
  );

create policy "expenses_delete_own"
  on public.expenses for delete
  to authenticated
  using (
    exists (
      select 1 from public.buildings b
      where b.id = building_id and b.owner_id = (select auth.uid())
    )
  );

-- Subscription requests policies (owners can read and submit pending requests; approvals require service_role)
create policy "subscription_requests_select_own"
  on public.subscription_requests for select
  to authenticated
  using (
    exists (
      select 1 from public.buildings b
      where b.id = building_id and b.owner_id = (select auth.uid())
    )
  );

create policy "subscription_requests_insert_own"
  on public.subscription_requests for insert
  to authenticated
  with check (
    status = 'pending'
    and exists (
      select 1 from public.buildings b
      where b.id = building_id and b.owner_id = (select auth.uid())
    )
  );

-- Private Storage bucket for receipt photos (path convention: <building_id>/<filename>)
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

create policy "receipts_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'receipts'
    and exists (
      select 1 from public.buildings b
      where b.id::text = (storage.foldername(name))[1]
        and b.owner_id = (select auth.uid())
    )
  );

create policy "receipts_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'receipts'
    and exists (
      select 1 from public.buildings b
      where b.id::text = (storage.foldername(name))[1]
        and b.owner_id = (select auth.uid())
    )
  );

create policy "receipts_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'receipts'
    and exists (
      select 1 from public.buildings b
      where b.id::text = (storage.foldername(name))[1]
        and b.owner_id = (select auth.uid())
    )
  )
  with check (
    bucket_id = 'receipts'
    and exists (
      select 1 from public.buildings b
      where b.id::text = (storage.foldername(name))[1]
        and b.owner_id = (select auth.uid())
    )
  );

create policy "receipts_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'receipts'
    and exists (
      select 1 from public.buildings b
      where b.id::text = (storage.foldername(name))[1]
        and b.owner_id = (select auth.uid())
    )
  );

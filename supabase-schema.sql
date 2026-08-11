-- ============================================================
-- PERSONAL FUND TRACKER — Supabase Schema
-- Run this ENTIRE file once in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. PROFILES (one row per Google-logged-in user, auto-created)
-- ------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  pin_hash text,
  pin_set boolean not null default false,
  is_suspended boolean not null default false,
  suspend_reason text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2. TRANSACTIONS (income + expense, fully isolated per user)
-- ------------------------------------------------------------
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income','expense')),
  category text not null,
  source_place text,
  amount numeric not null check (amount > 0),
  note text,
  txn_date date not null default current_date,
  ref_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_transactions_user on transactions(user_id);
create index if not exists idx_transactions_date on transactions(txn_date);

-- ------------------------------------------------------------
-- 3. FEEDBACK (admin -> specific user messages)
-- ------------------------------------------------------------
create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 4. Auto-create a profile row whenever someone signs in with Google
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- 5. Protect sensitive profile columns — only the backend
--    (service role, used by /api/pin and /api/admin) may change
--    pin_hash / pin_set / is_suspended / suspend_reason.
--    A normal logged-in user can still update full_name/avatar_url.
-- ------------------------------------------------------------
create or replace function public.protect_profile_fields()
returns trigger as $$
begin
  if auth.role() <> 'service_role' then
    new.is_suspended := old.is_suspended;
    new.suspend_reason := old.suspend_reason;
    new.pin_hash := old.pin_hash;
    new.pin_set := old.pin_set;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_protect_profile on profiles;
create trigger trg_protect_profile
  before update on profiles
  for each row execute procedure public.protect_profile_fields();

-- ------------------------------------------------------------
-- 6. Row Level Security
-- ------------------------------------------------------------
alter table profiles enable row level security;
alter table transactions enable row level security;
alter table feedback enable row level security;

-- Profiles: a user can only see / edit their own row.
create policy "profile_select_own" on profiles for select using (auth.uid() = id);
create policy "profile_update_own" on profiles for update using (auth.uid() = id);

-- Transactions: fully isolated per user (this is the core privacy rule).
create policy "txn_select_own" on transactions for select using (auth.uid() = user_id);
create policy "txn_insert_own" on transactions for insert with check (auth.uid() = user_id);
create policy "txn_update_own" on transactions for update using (auth.uid() = user_id);
create policy "txn_delete_own" on transactions for delete using (auth.uid() = user_id);

-- Feedback: a user may only READ feedback addressed to them.
-- Writing feedback is only done by the backend admin API (service role),
-- so no insert/update/delete policy is created for normal users on purpose.
create policy "feedback_select_own" on feedback for select using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 7. Storage bucket for profile avatars
--    (Run this part too — creates a public bucket named "avatars")
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatar_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatar_user_upload" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

create policy "avatar_user_update" on storage.objects
  for update using (bucket_id = 'avatars' and auth.role() = 'authenticated');

-- HomeLoop Step 10: families + membership + invite codes + profiles
-- Run in Supabase SQL Editor after Steps 6–6A are complete.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Profiles (minimal display names for family member list)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- ---------------------------------------------------------------------------
-- Families
-- ---------------------------------------------------------------------------
create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users (id),
  invite_code text not null,
  created_at timestamptz not null default now(),
  constraint families_invite_code_unique unique (invite_code)
);

create index if not exists families_created_by_idx
  on public.families (created_by);

create index if not exists families_invite_code_idx
  on public.families (invite_code);

alter table public.families enable row level security;

-- ---------------------------------------------------------------------------
-- Family members
-- ---------------------------------------------------------------------------
create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  constraint family_members_family_user_unique unique (family_id, user_id)
);

create index if not exists family_members_family_id_idx
  on public.family_members (family_id);

create index if not exists family_members_user_id_idx
  on public.family_members (user_id);

alter table public.family_members enable row level security;

-- ---------------------------------------------------------------------------
-- Helpers (security definer — avoid recursive RLS)
-- ---------------------------------------------------------------------------
create or replace function public.is_family_member(fid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members
    where family_id = fid
      and user_id = auth.uid()
  );
$$;

revoke all on function public.is_family_member(uuid) from public;
grant execute on function public.is_family_member(uuid) to authenticated;

create or replace function public.is_family_owner(fid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members
    where family_id = fid
      and user_id = auth.uid()
      and role = 'owner'
  );
$$;

revoke all on function public.is_family_owner(uuid) from public;
grant execute on function public.is_family_owner(uuid) to authenticated;

create or replace function public.generate_family_invite_code()
returns text
language plpgsql
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
begin
  for i in 1..8 loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return result;
end;
$$;

-- Join family by invite code (validated server-side; no client-trusted family_id)
create or replace function public.join_family_by_invite_code(invite text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text;
  fid uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Step 10: one family per user in the product UX
  if exists (
    select 1 from public.family_members where user_id = auth.uid()
  ) then
    raise exception 'You already belong to a family';
  end if;

  normalized := upper(trim(invite));
  if normalized is null or length(normalized) < 6 then
    raise exception 'Invalid invite code';
  end if;

  select id into fid
  from public.families
  where invite_code = normalized;

  if fid is null then
    raise exception 'Invalid invite code';
  end if;

  insert into public.family_members (family_id, user_id, role)
  values (fid, auth.uid(), 'member')
  on conflict (family_id, user_id) do nothing;

  return fid;
end;
$$;

revoke all on function public.join_family_by_invite_code(text) from public;
grant execute on function public.join_family_by_invite_code(text) to authenticated;

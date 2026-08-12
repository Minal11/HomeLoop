-- HomeLoop: iPhone Shortcut API tokens (hashed; plaintext shown once in app).

create table if not exists public.shortcut_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token_hash text not null unique,
  name text not null default 'iPhone Shortcut',
  created_at timestamptz not null default now(),
  last_used_at timestamptz null,
  revoked_at timestamptz null
);

create index if not exists shortcut_tokens_user_id_idx
  on public.shortcut_tokens (user_id);

create index if not exists shortcut_tokens_active_hash_idx
  on public.shortcut_tokens (token_hash)
  where revoked_at is null;

alter table public.shortcut_tokens enable row level security;

create policy "shortcut_tokens_select_own"
  on public.shortcut_tokens
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "shortcut_tokens_insert_own"
  on public.shortcut_tokens
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "shortcut_tokens_update_own"
  on public.shortcut_tokens
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- No delete policy: revoke by setting revoked_at instead.

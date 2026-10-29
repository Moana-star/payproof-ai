-- Individual account profiles and per-user order ownership for PayProof AI.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  workspace_name text not null default 'My workspace',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

alter table public.orders add column if not exists owner_id uuid references auth.users(id) on delete cascade;
create index if not exists orders_owner_created_idx on public.orders(owner_id, created_at desc);
drop policy if exists "Users can read own orders" on public.orders;
create policy "Users can read own orders" on public.orders for select to authenticated using ((select auth.uid()) = owner_id);
drop policy if exists "Users can insert own orders" on public.orders;
create policy "Users can insert own orders" on public.orders for insert to authenticated with check ((select auth.uid()) = owner_id);
drop policy if exists "Users can update own orders" on public.orders;
create policy "Users can update own orders" on public.orders for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.orders to authenticated;

create or replace function public.handle_new_user_profile()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, workspace_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(coalesce(new.email, 'user'), '@', 1)),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'workspace_name'), ''), 'My workspace')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile after insert on auth.users
for each row execute procedure public.handle_new_user_profile();

revoke all on function public.handle_new_user_profile() from public, anon, authenticated;

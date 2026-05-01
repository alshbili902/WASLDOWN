create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint unique not null,
  username text,
  first_name text,
  is_subscribed boolean default false,
  trial_used int default 0,
  trial_limit int default 5,
  subscription_end timestamptz,
  total_downloads int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists users_telegram_id_idx on public.users (telegram_id);
create index if not exists users_created_at_idx on public.users (created_at desc);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists users_set_updated_at on public.users;

create trigger users_set_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

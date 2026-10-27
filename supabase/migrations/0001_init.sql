-- coco on Supabase: one state document per user (pets, photos, traces, cards), every live model call logged,
-- and a private bucket for photos and paintings, one folder per user.
-- The app's server talks to these with the service role, always scoped to the signed-in user;
-- row level security keeps the tables closed to everyone else.

create table if not exists public.app_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null default '{"pets":[],"photos":[],"traces":[],"traits":[],"cards":[]}'::jsonb,
  version integer not null default 0, -- bumped on every save; a save that lost a race is refused
  updated_at timestamptz not null default now()
);
alter table public.app_state enable row level security;
drop policy if exists "own state" on public.app_state;
create policy "own state" on public.app_state for select using (auth.uid() = user_id);

create table if not exists public.usage_log (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete cascade,
  at timestamptz not null default now(),
  feature text not null,
  model text not null,
  ms integer,
  usage jsonb
);
create index if not exists usage_log_user_at on public.usage_log (user_id, at desc);
create index if not exists usage_log_at on public.usage_log (at desc);
alter table public.usage_log enable row level security;

-- private bucket: media/<user id>/<file>
insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;

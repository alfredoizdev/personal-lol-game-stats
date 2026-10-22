-- public.notification_prefs — per-user opt-in for goal status pushes
-- (Phase 7). Off by default; the desktop companion sends nothing unless
-- goal_push is true. goal_push_mode: 'change' = only when On track / Below
-- goal flips, 'interval' = every 5 minutes of game time plus on change.

create table public.notification_prefs (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  goal_push      boolean not null default false,
  goal_push_mode text not null default 'change' check (goal_push_mode in ('change','interval')),
  updated_at     timestamptz not null default now()
);

alter table public.notification_prefs enable row level security;

create policy notification_prefs_select_own on public.notification_prefs
  for select using (auth.uid() = user_id);

create policy notification_prefs_insert_own on public.notification_prefs
  for insert with check (auth.uid() = user_id);

create policy notification_prefs_update_own on public.notification_prefs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update on public.notification_prefs to authenticated;
grant all on public.notification_prefs to service_role;

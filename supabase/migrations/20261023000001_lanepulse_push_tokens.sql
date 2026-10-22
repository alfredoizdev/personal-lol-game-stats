-- public.lanepulse_push_tokens — Expo push tokens registered by the LanePulse
-- phone app (Phase 7). Separate from RiftLens's push_tokens on purpose: that
-- table does not distinguish apps and both apps share the same users, so a
-- shared table would deliver RiftLens coaching pushes to LanePulse phones and
-- LanePulse goal pushes to RiftLens phones.
--
-- Written by the phone (upsert on sign-in, revoked_at on sign-out) and read by
-- the desktop companion (same user's JWT) to send status-only goal messages.
-- DeviceNotRegistered answers from Expo set revoked_at.

create table public.lanepulse_push_tokens (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  expo_token    text not null,
  platform      text not null check (platform in ('ios','android')),
  app_version   text,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  revoked_at    timestamptz,
  unique (user_id, expo_token)
);

create index lanepulse_push_tokens_active
  on public.lanepulse_push_tokens (user_id)
  where revoked_at is null;

alter table public.lanepulse_push_tokens enable row level security;

create policy lanepulse_push_tokens_select_own on public.lanepulse_push_tokens
  for select using (auth.uid() = user_id);

create policy lanepulse_push_tokens_insert_own on public.lanepulse_push_tokens
  for insert with check (auth.uid() = user_id);

create policy lanepulse_push_tokens_update_own on public.lanepulse_push_tokens
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy lanepulse_push_tokens_delete_own on public.lanepulse_push_tokens
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.lanepulse_push_tokens to authenticated;
grant all on public.lanepulse_push_tokens to service_role;

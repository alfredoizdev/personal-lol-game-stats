-- One phone, one owner (Phase 7 review fix). A device's Expo token is the
-- same whoever signs in on that phone; uniqueness is per (user_id, token), so
-- a shared phone could hold an active row for user A and another for user B
-- and A's goal pushes would reach the phone B is holding. The last account to
-- register (or re-activate) a token owns it: any other user's active row for
-- the same token is revoked. Runs as definer because RLS hides other users'
-- rows from the signing-in client.

create or replace function public.lanepulse_push_tokens_claim()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.lanepulse_push_tokens
     set revoked_at = now()
   where expo_token = new.expo_token
     and user_id <> new.user_id
     and revoked_at is null;
  return new;
end;
$$;

revoke all on function public.lanepulse_push_tokens_claim() from public;

create trigger lanepulse_push_tokens_claim
  before insert or update of revoked_at on public.lanepulse_push_tokens
  for each row
  when (new.revoked_at is null)
  execute function public.lanepulse_push_tokens_claim();

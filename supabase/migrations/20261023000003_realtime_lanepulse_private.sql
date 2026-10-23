-- Realtime Authorization for the LanePulse live channel (Phase 7).
-- The desktop companion publishes live snapshots and the phone receives them
-- on the private broadcast topic 'lanepulse:<user id>'. These policies only
-- apply to private channels, so RiftLens's public 'user:<id>' channels in the
-- same project are untouched.

create policy "lanepulse_live_receive" on realtime.messages for select to authenticated
  using (realtime.messages.extension = 'broadcast' and realtime.topic() = 'lanepulse:' || auth.uid()::text);

create policy "lanepulse_live_send" on realtime.messages for insert to authenticated
  with check (realtime.messages.extension = 'broadcast' and realtime.topic() = 'lanepulse:' || auth.uid()::text);

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Guards the SQL that is copied verbatim to the RiftLens repo and applied with `supabase db push`.
const dir = join(__dirname, '..', '..', '..', 'supabase', 'migrations')
const read = (name: string) => readFileSync(join(dir, name), 'utf8').toLowerCase().replace(/[ \t]+/g, ' ')

describe('phase 7 migrations', () => {
  it('lanepulse_push_tokens: own-row RLS for the four verbs, grants, cascade and uniqueness', () => {
    const sql = read('20261023000001_lanepulse_push_tokens.sql')
    expect(sql).toContain('create table public.lanepulse_push_tokens')
    expect(sql).toContain('references auth.users(id) on delete cascade')
    expect(sql).toContain("check (platform in ('ios','android'))")
    expect(sql).toContain('unique (user_id, expo_token)')
    expect(sql).toContain('alter table public.lanepulse_push_tokens enable row level security')
    for (const verb of ['select', 'insert', 'update', 'delete']) {
      expect(sql).toMatch(new RegExp(`create policy \\w+ on public\\.lanepulse_push_tokens\\s+for ${verb}`))
    }
    expect(sql).toContain('grant select, insert, update, delete on public.lanepulse_push_tokens to authenticated')
    expect(sql).toContain('grant all on public.lanepulse_push_tokens to service_role')
    expect(sql).not.toMatch(/public\.push_tokens\b/)
  })

  it('notification_prefs: user_id primary key, defaults off/change, RLS select/insert/update, grants', () => {
    const sql = read('20261023000002_notification_prefs.sql')
    expect(sql).toContain('create table public.notification_prefs')
    expect(sql).toContain('user_id uuid primary key references auth.users(id) on delete cascade')
    expect(sql).toContain('goal_push boolean not null default false')
    expect(sql).toContain("goal_push_mode text not null default 'change' check (goal_push_mode in ('change','interval'))")
    expect(sql).toContain('alter table public.notification_prefs enable row level security')
    for (const verb of ['select', 'insert', 'update']) {
      expect(sql).toMatch(new RegExp(`create policy \\w+ on public\\.notification_prefs\\s+for ${verb}`))
    }
    expect(sql).toContain('grant select, insert, update on public.notification_prefs to authenticated')
    expect(sql).toContain('grant all on public.notification_prefs to service_role')
  })

  it('realtime policies: broadcast only, topic lanepulse:<uid>, select and insert for authenticated', () => {
    const sql = read('20261023000003_realtime_lanepulse_private.sql')
    expect(sql).toContain('create policy "lanepulse_live_receive" on realtime.messages for select to authenticated')
    expect(sql).toContain('create policy "lanepulse_live_send" on realtime.messages for insert to authenticated')
    expect(sql.match(/realtime\.messages\.extension = 'broadcast'/g)?.length).toBe(2)
    expect(sql.match(/realtime\.topic\(\) = 'lanepulse:' \|\| auth\.uid\(\)::text/g)?.length).toBe(2)
    expect(sql).not.toMatch(/'user:'/)
  })
})

describe('phase 7 fix: token ownership', () => {
  it('a device token registered by another user revokes that user\'s row (last device to register owns it)', () => {
    const sql = read('20261023000004_lanepulse_push_tokens_ownership.sql')
    expect(sql).toContain('create or replace function public.lanepulse_push_tokens_claim()')
    expect(sql).toContain('security definer')
    expect(sql).toContain('update public.lanepulse_push_tokens')
    expect(sql).toContain('set revoked_at = now()')
    expect(sql).toContain('where expo_token = new.expo_token')
    expect(sql).toContain('and user_id <> new.user_id')
    expect(sql).toContain('and revoked_at is null')
    expect(sql).toMatch(/create trigger lanepulse_push_tokens_claim\s+before insert or update of revoked_at on public\.lanepulse_push_tokens/)
    expect(sql).toContain('when (new.revoked_at is null)')
  })
})

describe('standing goals (pre_match_focus)', () => {
  it('target becomes nullable (null = the recommended value for the role) and the role check admits ANY', () => {
    const sql = read('20261023000005_pre_match_focus_standing.sql')
    expect(sql).toContain('alter table public.pre_match_focus alter column target drop not null')
    expect(sql).toContain("check (role in ('top','jungle','middle','bottom','utility','any'))".replace(/'(\w+)'/g, (m) => m.toUpperCase()).toLowerCase())
  })
})

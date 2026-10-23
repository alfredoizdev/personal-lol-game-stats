-- Standing goals (Phase 8, owner feedback): a goal that applies to every game,
-- whatever champion or role the player ends up with. Stored in the same
-- append-only table with champion_id = 0 and role = 'ANY'. A null target
-- means "the recommended value for the role I play" (resolved at game time
-- from the role targets); a number is a fixed target for every role.

alter table public.pre_match_focus alter column target drop not null;

alter table public.pre_match_focus
  add constraint pre_match_focus_role_check
  check (role in ('TOP','JUNGLE','MIDDLE','BOTTOM','UTILITY','ANY'));

comment on column public.pre_match_focus.target is 'Numeric target; null = recommended value for the role at game time (standing goals only).';
comment on column public.pre_match_focus.role is 'TOP | JUNGLE | MIDDLE | BOTTOM | UTILITY, or ANY for a standing goal (champion_id 0).';

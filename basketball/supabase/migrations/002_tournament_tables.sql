-- Migration 002: tournament_teams + tournament_matches tables
-- Fix tournaments.status enum to match TypeScript types
-- Add missing columns to matches

-- Fix tournaments status enum (drop old check, add new)
alter table tournaments
  drop constraint if exists tournaments_status_check;
alter table tournaments
  alter column status set default 'setup',
  add constraint tournaments_status_check
    check (status in ('setup','group_phase','knockout','finished'));
-- Update any legacy rows
update tournaments set status = 'setup' where status = 'draft';
update tournaments set status = 'group_phase' where status = 'group_stage';
update tournaments set status = 'knockout' where status = 'knockouts';

-- Also fix tournaments.format
alter table tournaments
  drop constraint if exists tournaments_format_check;
alter table tournaments
  alter column format set default 'group_knockout',
  add constraint tournaments_format_check
    check (format in ('group_knockout'));
update tournaments set format = 'group_knockout' where format = 'round_robin';

-- Add missing columns to matches
alter table matches
  add column if not exists starts_at timestamptz,
  add column if not exists time_remaining_seconds int;

-- tournament_teams
create table if not exists tournament_teams (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid references tournaments(id) on delete cascade not null,
  team_id uuid references teams(id) on delete cascade not null,
  group_name text,
  created_at timestamptz default now()
);

create index if not exists idx_tournament_teams_tournament on tournament_teams(tournament_id);

alter table tournament_teams enable row level security;
create policy "Public read tournament_teams" on tournament_teams for select using (true);
create policy "Anon insert tournament_teams" on tournament_teams for insert with check (true);
create policy "Anon update tournament_teams" on tournament_teams for update using (true);
create policy "Anon delete tournament_teams" on tournament_teams for delete using (true);

-- tournament_matches
create table if not exists tournament_matches (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid references tournaments(id) on delete cascade not null,
  phase text not null check (phase in ('group','qf','sf','final')),
  round_index int not null default 0,
  match_slot int not null default 0,
  home_team_id uuid references teams(id) on delete set null,
  away_team_id uuid references teams(id) on delete set null,
  match_id uuid references matches(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_tournament_matches_tournament on tournament_matches(tournament_id);
create index if not exists idx_tournament_matches_phase on tournament_matches(tournament_id, phase);

alter table tournament_matches enable row level security;
create policy "Public read tournament_matches" on tournament_matches for select using (true);
create policy "Anon insert tournament_matches" on tournament_matches for insert with check (true);
create policy "Anon update tournament_matches" on tournament_matches for update using (true);
create policy "Anon delete tournament_matches" on tournament_matches for delete using (true);

-- Allow deletes on matches and teams (needed by seed re-runs)
create policy "Anon delete teams" on teams for delete using (true);
create policy "Anon delete matches" on matches for delete using (true);
create policy "Anon delete tournaments" on tournaments for delete using (true);

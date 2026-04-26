-- HandBallLab — Initial Schema
-- Run this in Supabase SQL Editor to set up the database

-- === Enable UUID generation ===
create extension if not exists "uuid-ossp";

-- === Teams ===
create table teams (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  nickname text,
  badge_url text,
  city_district text,
  created_at timestamptz default now()
);

-- === Players ===
create table players (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid references teams(id) on delete cascade not null,
  display_name text not null, -- first name or nickname only, no PII
  number int not null,
  role text not null check (role in ('GK','LW','RW','LB','RB','CB','PV')),
  avatar_url text,
  strengths text[] default '{}',
  created_at timestamptz default now()
);

-- === Tournaments ===
create table tournaments (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  num_teams int not null default 8,
  status text not null default 'draft' check (status in ('draft','group_stage','knockouts','finished')),
  viewer_code text not null default substr(md5(random()::text), 1, 6),
  created_at timestamptz default now()
);

-- === Matches ===
create table matches (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid references tournaments(id) on delete set null,
  phase text check (phase in ('group','semi','final')),
  group_label text check (group_label in ('A','B')),
  home_team_id uuid references teams(id) not null,
  away_team_id uuid references teams(id) not null,
  home_score int not null default 0,
  away_score int not null default 0,
  status text not null default 'scheduled' check (status in ('scheduled','running','paused','halftime','finished')),
  current_half int not null default 1,
  clock_seconds int not null default 0,
  -- Match config (copied from rules at creation, immutable during play)
  config_halves int not null default 2,
  config_half_duration_minutes int not null default 20,
  config_timeouts_per_half int not null default 1,
  config_exclusion_duration_seconds int not null default 120,
  -- Access codes
  scorekeeper_code text not null default substr(md5(random()::text), 1, 6),
  stat_tracker_code text not null default substr(md5(random()::text), 1, 6),
  viewer_code text not null default substr(md5(random()::text), 1, 6),
  scorekeeper_claimed_by text,
  stat_tracker_claimed_by text,
  -- Timeouts remaining
  home_timeouts_left int not null default 1,
  away_timeouts_left int not null default 1,
  -- Timestamps
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz default now()
);

-- === Match Events ===
create table match_events (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid references matches(id) on delete cascade not null,
  type text not null check (type in ('goal','assist','save','exclusion','timeout','halftime')),
  team_id uuid references teams(id),
  player_id uuid references players(id),
  related_event_id uuid references match_events(id),
  minute int not null default 0,
  half int not null default 1,
  synced boolean not null default true,
  created_at timestamptz default now()
);

-- === Indexes ===
create index idx_matches_status on matches(status);
create index idx_matches_tournament on matches(tournament_id);
create index idx_match_events_match on match_events(match_id);
create index idx_players_team on players(team_id);

-- === Enable Realtime ===
alter publication supabase_realtime add table matches;
alter publication supabase_realtime add table match_events;

-- === Row Level Security ===
-- For MVP: allow all reads (public scoreboard), restrict writes to authenticated or anon with valid codes
-- This will be tightened when access codes are implemented (#6)

alter table teams enable row level security;
alter table players enable row level security;
alter table tournaments enable row level security;
alter table matches enable row level security;
alter table match_events enable row level security;

-- Read access: anyone can view (public scoreboard)
create policy "Public read teams" on teams for select using (true);
create policy "Public read players" on players for select using (true);
create policy "Public read tournaments" on tournaments for select using (true);
create policy "Public read matches" on matches for select using (true);
create policy "Public read match_events" on match_events for select using (true);

-- Write access: allow anon inserts/updates for MVP (will be restricted with access codes in #6)
create policy "Anon insert teams" on teams for insert with check (true);
create policy "Anon update teams" on teams for update using (true);
create policy "Anon insert players" on players for insert with check (true);
create policy "Anon update players" on players for update using (true);
create policy "Anon insert tournaments" on tournaments for insert with check (true);
create policy "Anon update tournaments" on tournaments for update using (true);
create policy "Anon insert matches" on matches for insert with check (true);
create policy "Anon update matches" on matches for update using (true);
create policy "Anon insert match_events" on match_events for insert with check (true);
create policy "Anon update match_events" on match_events for update using (true);

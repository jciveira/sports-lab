-- HandBallLab — Venues support for tournaments
-- Adds venues table and venue_id FK on matches

-- === Venues ===
create table if not exists venues (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid references tournaments(id) on delete cascade not null,
  name text not null,
  address text,
  created_at timestamptz default now()
);

-- === venue_id on matches ===
alter table matches
  add column if not exists venue_id uuid references venues(id) on delete set null;

-- BasketballLab — Venues support
-- Adds venues table and venue_id FK on matches

create table if not exists venues (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid references tournaments(id) on delete cascade not null,
  name text not null,
  address text,
  created_at timestamptz default now()
);

alter table matches
  add column if not exists venue_id uuid references venues(id) on delete set null;

-- RLS
alter table venues enable row level security;
create policy "Public read venues" on venues for select using (true);
create policy "Anon insert venues" on venues for insert with check (true);
create policy "Anon update venues" on venues for update using (true);
create policy "Anon delete venues" on venues for delete using (true);

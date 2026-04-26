-- Tournament mode: categories, groups, team assignments

-- Add date and category support to tournaments
alter table tournaments add column if not exists date date;

-- Tournament categories (e.g. boys / girls)
create table tournament_categories (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid references tournaments(id) on delete cascade not null,
  name text not null, -- e.g. 'Boys', 'Girls'
  created_at timestamptz default now()
);

-- Groups within a category (A, B)
create table tournament_groups (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid references tournament_categories(id) on delete cascade not null,
  label text not null check (label in ('A', 'B')),
  created_at timestamptz default now(),
  unique(category_id, label)
);

-- Team assignments to groups
create table tournament_group_teams (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid references tournament_groups(id) on delete cascade not null,
  team_id uuid references teams(id) not null,
  created_at timestamptz default now(),
  unique(group_id, team_id)
);

-- Add source field to matches (live scoreboard vs manual entry)
alter table matches add column if not exists source text not null default 'live' check (source in ('live', 'manual'));

-- Link matches to tournament groups
alter table matches add column if not exists tournament_group_id uuid references tournament_groups(id) on delete set null;

-- Link matches to tournament categories
alter table matches add column if not exists tournament_category_id uuid references tournament_categories(id) on delete set null;

-- RLS policies
alter table tournament_categories enable row level security;
alter table tournament_groups enable row level security;
alter table tournament_group_teams enable row level security;

create policy "Public read tournament_categories" on tournament_categories for select using (true);
create policy "Public read tournament_groups" on tournament_groups for select using (true);
create policy "Public read tournament_group_teams" on tournament_group_teams for select using (true);

create policy "Anon insert tournament_categories" on tournament_categories for insert with check (true);
create policy "Anon insert tournament_groups" on tournament_groups for insert with check (true);
create policy "Anon insert tournament_group_teams" on tournament_group_teams for insert with check (true);

create policy "Anon update tournament_categories" on tournament_categories for update using (true);
create policy "Anon update tournament_groups" on tournament_groups for update using (true);
create policy "Anon update tournament_group_teams" on tournament_group_teams for update using (true);

create policy "Anon delete tournament_categories" on tournament_categories for delete using (true);
create policy "Anon delete tournament_groups" on tournament_groups for delete using (true);
create policy "Anon delete tournament_group_teams" on tournament_group_teams for delete using (true);

-- Indexes
create index idx_tournament_categories_tournament on tournament_categories(tournament_id);
create index idx_tournament_groups_category on tournament_groups(category_id);
create index idx_tournament_group_teams_group on tournament_group_teams(group_id);
create index idx_matches_tournament_group on matches(tournament_group_id);
create index idx_matches_tournament_category on matches(tournament_category_id);

-- Enable realtime on new tables
alter publication supabase_realtime add table tournament_categories;
alter publication supabase_realtime add table tournament_groups;
alter publication supabase_realtime add table tournament_group_teams;

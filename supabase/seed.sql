-- Seed data for development — teams with rosters

insert into teams (id, name, nickname, badge_url, city_district) values
  ('a1111111-1111-1111-1111-111111111111', 'Sharks', 'Sharks', null, 'North'),
  ('b2222222-2222-2222-2222-222222222222', 'Wolves', 'Wolves', null, 'South'),
  ('c3333333-3333-3333-3333-333333333333', 'Dominicos', 'Dominicos', 'https://api.clupik.com/clubs/3624/seo/image.jpg', 'A Coruña');

insert into players (team_id, display_name, number, role) values
  -- Sharks
  ('a1111111-1111-1111-1111-111111111111', 'Leo', 1, 'GK'),
  ('a1111111-1111-1111-1111-111111111111', 'Mateo', 7, 'RW'),
  ('a1111111-1111-1111-1111-111111111111', 'Dani', 9, 'CB'),
  ('a1111111-1111-1111-1111-111111111111', 'Alex', 3, 'LB'),
  ('a1111111-1111-1111-1111-111111111111', 'Nico', 5, 'PV'),
  ('a1111111-1111-1111-1111-111111111111', 'Hugo', 11, 'LW'),
  ('a1111111-1111-1111-1111-111111111111', 'Pablo', 4, 'RB'),
  -- Wolves
  ('b2222222-2222-2222-2222-222222222222', 'Carlos', 1, 'GK'),
  ('b2222222-2222-2222-2222-222222222222', 'Miguel', 8, 'LW'),
  ('b2222222-2222-2222-2222-222222222222', 'Lucas', 10, 'CB'),
  ('b2222222-2222-2222-2222-222222222222', 'David', 2, 'RB'),
  ('b2222222-2222-2222-2222-222222222222', 'Marco', 6, 'PV'),
  ('b2222222-2222-2222-2222-222222222222', 'Ivan', 12, 'RW'),
  ('b2222222-2222-2222-2222-222222222222', 'Rafa', 3, 'LB');

-- A sample match (scheduled, not started)
insert into matches (home_team_id, away_team_id) values
  ('c3333333-3333-3333-3333-333333333333', 'a1111111-1111-1111-1111-111111111111');

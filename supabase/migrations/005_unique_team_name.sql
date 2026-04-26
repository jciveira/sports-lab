-- Enforce unique team names (case-insensitive, trimmed)
CREATE UNIQUE INDEX unique_team_name ON teams (lower(trim(name)));

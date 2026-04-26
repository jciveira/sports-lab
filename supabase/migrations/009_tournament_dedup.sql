-- Tournament deduplication: unique constraints + delete policies (#42)

-- 1. Unique index on tournament name (case-insensitive, trimmed)
-- Follows the same pattern as teams (005_unique_team_name.sql)
CREATE UNIQUE INDEX IF NOT EXISTS unique_tournament_name ON tournaments (lower(trim(name)));

-- 2. Unique constraint: category name within a tournament
CREATE UNIQUE INDEX IF NOT EXISTS unique_category_name_per_tournament
  ON tournament_categories (tournament_id, lower(trim(name)));

-- 3. Delete RLS policies for all tables that don't have them yet
-- (anon delete for MVP — will be tightened with auth later)
CREATE POLICY "Anon delete tournaments" ON tournaments FOR DELETE USING (true);
CREATE POLICY "Anon delete matches" ON matches FOR DELETE USING (true);
CREATE POLICY "Anon delete match_events" ON match_events FOR DELETE USING (true);
CREATE POLICY "Anon delete players" ON players FOR DELETE USING (true);

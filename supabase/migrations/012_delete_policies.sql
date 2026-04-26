-- Add missing DELETE RLS policies for teams, matches, and match_events.
-- 002_teams_delete_policy.sql was never applied to the live DB;
-- matches and match_events never had delete policies at all.

DO $$ BEGIN
  -- Teams (002 was missed)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'teams' AND policyname = 'Anon delete teams') THEN
    CREATE POLICY "Anon delete teams" ON teams FOR DELETE USING (true);
  END IF;

  -- Match events (must be deletable before their parent match)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'match_events' AND policyname = 'Anon delete match_events') THEN
    CREATE POLICY "Anon delete match_events" ON match_events FOR DELETE USING (true);
  END IF;

  -- Matches
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'matches' AND policyname = 'Anon delete matches') THEN
    CREATE POLICY "Anon delete matches" ON matches FOR DELETE USING (true);
  END IF;
END $$;

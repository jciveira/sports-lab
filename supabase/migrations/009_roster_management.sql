-- Roster management: availability + injury tracking (#28)

-- Make team_id nullable so players can be unassigned (free agent pool)
ALTER TABLE players ALTER COLUMN team_id DROP NOT NULL;

-- Change ON DELETE CASCADE to SET NULL — removing a team shouldn't delete its players
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_team_id_fkey;
ALTER TABLE players ADD CONSTRAINT players_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL;

-- Add availability and injury status
ALTER TABLE players ADD COLUMN IF NOT EXISTS available boolean NOT NULL DEFAULT true;
ALTER TABLE players ADD COLUMN IF NOT EXISTS injured boolean NOT NULL DEFAULT false;

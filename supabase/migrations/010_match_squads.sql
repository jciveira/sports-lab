-- Match squad selection (#30)
-- Store which players from each team are active for a given match

ALTER TABLE matches ADD COLUMN IF NOT EXISTS home_squad jsonb DEFAULT NULL;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS away_squad jsonb DEFAULT NULL;

-- home_squad / away_squad contain arrays of player IDs: ["uuid1", "uuid2", ...]
-- NULL means "no squad selected" (full available roster assumed)
COMMENT ON COLUMN matches.home_squad IS 'Array of player IDs selected for home team, or NULL for full roster';
COMMENT ON COLUMN matches.away_squad IS 'Array of player IDs selected for away team, or NULL for full roster';

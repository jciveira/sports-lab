-- Add not_played flag to matches.
-- "Not played" is distinct from postponed/cancelled: the game was scheduled
-- but never took place (bye, walkover, cancellation).
-- Marked by admin; hidden from public bracket/standings; visible muted in admin.
ALTER TABLE matches ADD COLUMN IF NOT EXISTS not_played BOOLEAN NOT NULL DEFAULT FALSE;

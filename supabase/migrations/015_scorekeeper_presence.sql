-- Scorekeeper presence tracking for first-come, first-served access model
-- scorekeeper_name: display name shown to viewers ("Anotado por [nombre]")
-- scorekeeper_last_active_at: heartbeat timestamp for timeout detection (2 min TTL)

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS scorekeeper_name TEXT NULL,
  ADD COLUMN IF NOT EXISTS scorekeeper_last_active_at TIMESTAMPTZ NULL;

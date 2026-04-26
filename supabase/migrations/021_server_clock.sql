-- Replace session-driven clock_seconds with server-side timestamps.
-- All clients compute elapsed time independently from these two columns:
--   clock_seconds_base  — elapsed seconds at last pause/half-reset
--   clock_started_at    — when the clock last started/resumed (null = paused)
-- Formula: floor(clock_seconds_base + (now - clock_started_at) / 1000) when running,
--          clock_seconds_base when paused.
-- clock_seconds is kept for legacy/fallback but is no longer written by clients.

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS clock_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS clock_seconds_base integer NOT NULL DEFAULT 0;

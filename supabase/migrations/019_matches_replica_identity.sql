-- Fix: ensure realtime UPDATE payloads include all columns, not just changed ones.
--
-- Without FULL replica identity, a heartbeat update (which only changes
-- scorekeeper_last_active_at) only includes that column + PK in payload.new.
-- Viewer clients read row.scorekeeper_claimed_by = undefined, which coerces to
-- false, flipping scorekeeperClaimed to false and showing the "Ser anotador"
-- button even though the role is active. The subsequent claim then fails with
-- "role already taken".

ALTER TABLE matches REPLICA IDENTITY FULL;

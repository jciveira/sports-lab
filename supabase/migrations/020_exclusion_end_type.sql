-- Add 'exclusion_end' to the match_events type CHECK constraint.
-- The original constraint only allowed ('goal','assist','save','exclusion','timeout','halftime'),
-- causing silent INSERT failures when scorekeepers dismissed exclusions.

DO $$
DECLARE
  v_constraint text;
BEGIN
  SELECT conname INTO v_constraint
  FROM pg_constraint
  WHERE conrelid = 'match_events'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%type%';

  IF v_constraint IS NOT NULL THEN
    EXECUTE 'ALTER TABLE match_events DROP CONSTRAINT ' || quote_ident(v_constraint);
  END IF;
END;
$$;

ALTER TABLE match_events
  ADD CONSTRAINT match_events_type_check
  CHECK (type IN ('goal', 'assist', 'save', 'exclusion', 'exclusion_end', 'timeout', 'halftime'));

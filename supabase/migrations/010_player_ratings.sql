-- Add FIFA-style ratings and card type to players
-- ratings: JSONB with 6 numeric stats (field or GK schema)
-- card_type: visual card variant (base, toty, etc.)

ALTER TABLE players ADD COLUMN IF NOT EXISTS ratings jsonb DEFAULT NULL;
ALTER TABLE players ADD COLUMN IF NOT EXISTS card_type text NOT NULL DEFAULT 'base';

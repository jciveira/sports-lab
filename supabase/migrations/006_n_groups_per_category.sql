-- Support N groups per category (not just A/B)
-- Needed for tournaments like CORRALES with 4 groups per category.

-- Drop the CHECK constraint that limits labels to 'A' or 'B'
-- and the UNIQUE constraint that limits to 2 groups per category.
-- Replace with a UNIQUE constraint on (category_id, label) to prevent
-- duplicate labels within a category, but allow any label string.

alter table tournament_groups drop constraint if exists tournament_groups_label_check;
alter table tournament_groups drop constraint if exists tournament_groups_category_id_label_key;

-- Re-add unique constraint (category_id, label) without the A/B check
alter table tournament_groups add constraint tournament_groups_category_id_label_key unique (category_id, label);

-- Drop the A/B check on matches.group_label too
alter table matches drop constraint if exists matches_group_label_check;

-- Update matches phase enum to include 'quarter' for tournaments with 4+ groups
alter table matches drop constraint if exists matches_phase_check;

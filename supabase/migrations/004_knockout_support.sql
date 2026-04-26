-- Knockout support: additional phases + penalty shootout fields

-- Expand phase check to include third_place and semi
alter table matches drop constraint if exists matches_phase_check;
alter table matches add constraint matches_phase_check check (phase in ('group', 'semi', 'third_place', 'final'));

-- Penalty shootout scores (null if no shootout)
alter table matches add column if not exists penalty_home_score int;
alter table matches add column if not exists penalty_away_score int;

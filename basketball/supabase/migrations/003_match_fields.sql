-- BasketballLab — Match scheduling and not-played flag

alter table matches
  add column if not exists scheduled_at timestamptz;

alter table matches
  add column if not exists not_played boolean not null default false;

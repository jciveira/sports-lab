-- Suggestions table for in-app user suggestions
create table suggestions (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  name text,
  created_at timestamptz default now()
);

-- RLS policies (public read/write for anon users, matching bug_reports pattern)
alter table suggestions enable row level security;
create policy "Public read suggestions" on suggestions for select using (true);
create policy "Anon insert suggestions" on suggestions for insert with check (true);

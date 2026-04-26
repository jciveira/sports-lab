-- Suggestions table for in-app user feedback
create table suggestions (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  name text,
  created_at timestamptz default now()
);

-- RLS policies (public read/write for anon users, same as bug_reports)
alter table suggestions enable row level security;
create policy "Public read suggestions" on suggestions for select using (true);
create policy "Anon insert suggestions" on suggestions for insert with check (true);

-- Enable realtime
alter publication supabase_realtime add table suggestions;

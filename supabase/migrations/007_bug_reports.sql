-- Bug reports table for in-app bug reporting
create table bug_reports (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  page_url text,
  user_agent text,
  created_at timestamptz default now()
);

-- RLS policies (public read/write for anon users, same as suggestions)
alter table bug_reports enable row level security;
create policy "Public read bug_reports" on bug_reports for select using (true);
create policy "Anon insert bug_reports" on bug_reports for insert with check (true);

-- Enable realtime
alter publication supabase_realtime add table bug_reports;

-- HandBallLab — Enable RLS on venues table (fixes Supabase lint warning)

alter table venues enable row level security;

create policy "Public read venues" on venues for select using (true);
create policy "Anon insert venues" on venues for insert with check (true);
create policy "Anon update venues" on venues for update using (true);
create policy "Anon delete venues" on venues for delete using (true);

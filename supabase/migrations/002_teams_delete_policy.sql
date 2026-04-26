-- Allow anon delete on teams for MVP (will be restricted with auth in future)
create policy "Anon delete teams" on teams for delete using (true);

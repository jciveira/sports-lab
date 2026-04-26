-- Add screenshot support to bug reports
alter table bug_reports add column screenshot_url text;

-- Create storage bucket for bug screenshots
insert into storage.buckets (id, name, public)
values ('bug-screenshots', 'bug-screenshots', true)
on conflict (id) do nothing;

-- Allow anyone to upload to the bug-screenshots bucket
create policy "Public upload bug-screenshots"
  on storage.objects for insert
  with check (bucket_id = 'bug-screenshots');

-- Allow anyone to read from the bug-screenshots bucket
create policy "Public read bug-screenshots"
  on storage.objects for select
  using (bucket_id = 'bug-screenshots');

-- Add groomed flag to bug_reports and suggestions for groom session tracking
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS groomed boolean NOT NULL DEFAULT false;
ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS groomed boolean NOT NULL DEFAULT false;

-- Allow anon to update (groom session marks reports as processed)
CREATE POLICY "Anon update bug_reports" ON bug_reports FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anon update suggestions" ON suggestions FOR UPDATE USING (true) WITH CHECK (true);

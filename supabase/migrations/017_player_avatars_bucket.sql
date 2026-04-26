-- HandBallLab — Player avatars storage bucket
-- Private bucket: files accessed via signed URLs (not public)

insert into storage.buckets (id, name, public)
values ('player-avatars', 'player-avatars', false)
on conflict (id) do nothing;

DO $$ BEGIN
  -- Authenticated users (admin) can upload player avatars
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Authenticated upload player-avatars'
  ) THEN
    CREATE POLICY "Authenticated upload player-avatars"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'player-avatars');
  END IF;

  -- Authenticated users can replace player avatars
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Authenticated update player-avatars'
  ) THEN
    CREATE POLICY "Authenticated update player-avatars"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'player-avatars');
  END IF;

  -- Authenticated users can delete player avatars
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Authenticated delete player-avatars'
  ) THEN
    CREATE POLICY "Authenticated delete player-avatars"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'player-avatars');
  END IF;

  -- Anyone can read (signed URL validation handled by Supabase)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Public read player-avatars'
  ) THEN
    CREATE POLICY "Public read player-avatars"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'player-avatars');
  END IF;
END $$;

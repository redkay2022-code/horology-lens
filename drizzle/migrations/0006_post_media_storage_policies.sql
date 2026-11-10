CREATE POLICY "Users upload own post media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own post media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owners read own post media" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Published post media is readable" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'post-media' AND EXISTS (SELECT 1 FROM public.posts p WHERE p.video_path = storage.objects.name));
CREATE POLICY "creators read own files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'deliverables' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "creators upload own files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'deliverables' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "creators update own files" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'deliverables' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "creators delete own files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'deliverables' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "auth read documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documents');
CREATE POLICY "auth insert documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');
CREATE POLICY "auth update documents" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'documents') WITH CHECK (bucket_id = 'documents');
CREATE POLICY "auth delete documents" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documents') ;

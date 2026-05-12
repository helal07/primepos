INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Branding files are publicly viewable" ON storage.objects;
CREATE POLICY "Branding files are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'branding');

DROP POLICY IF EXISTS "Authenticated can upload branding" ON storage.objects;
CREATE POLICY "Authenticated can upload branding"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'branding');

DROP POLICY IF EXISTS "Authenticated can update branding" ON storage.objects;
CREATE POLICY "Authenticated can update branding"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'branding');

DROP POLICY IF EXISTS "Authenticated can delete branding" ON storage.objects;
CREATE POLICY "Authenticated can delete branding"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'branding');
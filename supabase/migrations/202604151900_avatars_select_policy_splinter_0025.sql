-- Splinter lint 0025_public_bucket_allows_listing: no usar SELECT con USING = solo bucket_id.
-- La app guarda en {user_uuid}/{archivo} (upload-profile-avatar.ts, upload-shop-logo.ts).
-- Añadir predicados extra mantiene URLs públicas y evita el patrón "demasiado amplio" del linter.
DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;

CREATE POLICY "avatars_select_public"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'avatars'
    AND coalesce(array_length(storage.foldername(name), 1), 0) >= 2
    AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

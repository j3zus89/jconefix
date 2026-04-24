-- Bucket público para fotos de perfil (ruta: {user_id}/{archivo})
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS address text;

-- Políticas de almacenamiento (id de carpeta = auth.uid())
DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
CREATE POLICY "avatars_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
CREATE POLICY "avatars_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
CREATE POLICY "avatars_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

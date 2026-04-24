-- =============================================================================
-- TODO EN UNO: Contacto apoyo (tabla) + avatares (bucket Storage + columnas perfil)
-- Ejecutar en Supabase → SQL Editor (pegar y Run) si aún no aplicaste las migraciones.
-- Equivale a: 202604022200 + 202604022105 + 202604022310 (y panel/campana: 202604022103)
--
-- Si además te faltan columnas tipo organization_id, technicians, chat, etc.,
-- usa el script más amplio: schema_catchup_panel_completo.sql (incluye este bloque).
-- =============================================================================

-- --- 1) support_chat_messages ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations (id) ON DELETE SET NULL,
  sender text NOT NULL CHECK (sender IN ('user', 'admin')),
  body text NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 8000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_chat_user_created
  ON public.support_chat_messages (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_chat_org_created
  ON public.support_chat_messages (organization_id, created_at DESC);

ALTER TABLE public.support_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_chat_select_own" ON public.support_chat_messages;
CREATE POLICY "support_chat_select_own"
  ON public.support_chat_messages FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "support_chat_insert_user" ON public.support_chat_messages;
CREATE POLICY "support_chat_insert_user"
  ON public.support_chat_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND sender = 'user');

COMMENT ON TABLE public.support_chat_messages IS 'Chat soporte técnico: filas con user_id del cliente panel; admin inserta con service role (sender admin).';

-- --- 2) Bucket avatars + columnas profiles -----------------------------------
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

-- --- 3) Lectura pública de avatares ------------------------------------------
DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
CREATE POLICY "avatars_select_public"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'avatars'
    AND coalesce(array_length(storage.foldername(name), 1), 0) >= 2
    AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

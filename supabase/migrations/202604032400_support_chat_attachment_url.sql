-- Adjuntos en mensajes de soporte (URL pública tras subida vía API super admin).

ALTER TABLE public.support_chat_messages
  ADD COLUMN IF NOT EXISTS attachment_url text;

COMMENT ON COLUMN public.support_chat_messages.attachment_url IS
  'Imagen/archivo en chat soporte; subida con service role.';

INSERT INTO storage.buckets (id, name, public)
VALUES ('support_chat_uploads', 'support_chat_uploads', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "support_chat_uploads_insert_service" ON storage.objects;
DROP POLICY IF EXISTS "support_chat_uploads_select_public" ON storage.objects;

-- Lectura pública (URL en mensaje); escritura solo desde backend con service role (bypass RLS).
CREATE POLICY "support_chat_uploads_select_public"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'support_chat_uploads');

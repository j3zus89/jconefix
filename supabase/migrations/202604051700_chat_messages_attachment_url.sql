-- Adjuntos en chat interno del panel (team chat / FloatingChat).

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS attachment_url text;

COMMENT ON COLUMN public.chat_messages.attachment_url IS
  'URL pública del adjunto (Storage bucket team_chat_uploads).';

INSERT INTO storage.buckets (id, name, public)
VALUES ('team_chat_uploads', 'team_chat_uploads', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "team_chat_uploads_select_public" ON storage.objects;

CREATE POLICY "team_chat_uploads_select_public"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'team_chat_uploads');

-- Escritura vía service role (API route); sin política INSERT para anon/authenticated.

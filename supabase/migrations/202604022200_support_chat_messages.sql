-- Mensajes de «Contacto apoyo»: el usuario del panel escribe; el super admin responde vía API (service role).
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

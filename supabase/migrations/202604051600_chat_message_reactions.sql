-- Reacciones al chat interno (👍, etc.). Opcional: si no aplicas esta migración, el panel oculta el pill de reacciones.
CREATE TABLE IF NOT EXISTS public.chat_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.chat_messages (id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL DEFAULT '👍',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS chat_message_reactions_message_id_idx
  ON public.chat_message_reactions (message_id);

ALTER TABLE public.chat_message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_message_reactions_select_org" ON public.chat_message_reactions;
DROP POLICY IF EXISTS "chat_message_reactions_insert_own" ON public.chat_message_reactions;
DROP POLICY IF EXISTS "chat_message_reactions_delete_own" ON public.chat_message_reactions;

CREATE POLICY "chat_message_reactions_select_org"
  ON public.chat_message_reactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.chat_messages cm
      WHERE cm.id = chat_message_reactions.message_id
        AND cm.organization_id IN (SELECT public.user_organization_ids())
    )
  );

CREATE POLICY "chat_message_reactions_insert_own"
  ON public.chat_message_reactions
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.chat_messages cm
      WHERE cm.id = message_id
        AND cm.organization_id IN (SELECT public.user_organization_ids())
    )
  );

CREATE POLICY "chat_message_reactions_delete_own"
  ON public.chat_message_reactions
  FOR DELETE
  USING (user_id = auth.uid());

COMMENT ON TABLE public.chat_message_reactions IS 'Reacciones a mensajes del chat interno del panel (por organización vía mensaje padre).';

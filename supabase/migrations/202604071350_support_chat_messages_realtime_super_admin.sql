-- Chat «Contacto apoyo» en panel super admin: eventos Realtime (postgres_changes).
-- Requiere que el JWT del super admin pueda SELECT todas las filas (is_super_admin).

ALTER TABLE public.support_chat_messages REPLICA IDENTITY FULL;

DROP POLICY IF EXISTS "support_chat_select_super_admin" ON public.support_chat_messages;
CREATE POLICY "support_chat_select_super_admin"
  ON public.support_chat_messages FOR SELECT TO authenticated
  USING (is_super_admin());

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE NOTICE 'publicación supabase_realtime no existe (entorno local); omite ADD TABLE';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'support_chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_chat_messages;
  END IF;
END $$;

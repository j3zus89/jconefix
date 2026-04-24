-- Realtime: cuando el cliente actualiza user_last_read_message_id, el super admin recibe el UPDATE al instante.

ALTER TABLE public.support_chat_threads REPLICA IDENTITY FULL;

DROP POLICY IF EXISTS "support_chat_threads_select_super_admin" ON public.support_chat_threads;
CREATE POLICY "support_chat_threads_select_super_admin"
  ON public.support_chat_threads FOR SELECT TO authenticated
  USING (is_super_admin());

COMMENT ON POLICY "support_chat_threads_select_super_admin" ON public.support_chat_threads IS
  'Permite a SUPER_ADMIN suscribirse a Realtime y leer punteros de lectura de todos los hilos.';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE NOTICE 'publicación supabase_realtime no existe; omite ADD TABLE';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'support_chat_threads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_chat_threads;
  END IF;
END $$;

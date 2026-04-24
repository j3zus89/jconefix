-- Chat interno (FloatingChat / dashboard chat): suscripciones `postgres_changes` sobre `chat_messages`.
-- Sin esto, el INSERT funciona vía REST pero no llegan eventos en tiempo casi real.

ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

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
      AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
END $$;

-- Retención del chat interno: borrar mensajes con más de 7 días.
-- El panel ya solo consulta los últimos 7 días (`getChatMessagesSinceIso` en la app).
--
-- Programar en Supabase (Database → Extensions → pg_cron si está disponible), o ejecutar
-- manualmente en SQL Editor de vez en cuando:
--   SELECT public.purge_chat_messages_older_than_7_days();

CREATE OR REPLACE FUNCTION public.purge_chat_messages_older_than_7_days()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH deleted AS (
    DELETE FROM public.chat_messages
    WHERE created_at < (now() AT TIME ZONE 'utc') - interval '7 days'
    RETURNING id
  )
  SELECT count(*)::int FROM deleted;
$$;

REVOKE ALL ON FUNCTION public.purge_chat_messages_older_than_7_days() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_chat_messages_older_than_7_days() TO service_role;

COMMENT ON FUNCTION public.purge_chat_messages_older_than_7_days() IS
  'Elimina filas de chat_messages más antiguas que 7 días. Ejecutar vía cron o SQL Editor.';

-- El cliente del panel marca lectura al cargar mensajes; el super admin ve ✓✓ gris / azul.

ALTER TABLE public.support_chat_threads
  ADD COLUMN IF NOT EXISTS user_last_read_message_id uuid REFERENCES public.support_chat_messages (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.support_chat_threads.user_last_read_message_id IS
  'Último mensaje que el usuario del panel reconoció al abrir/recargar el chat. Sirve para recibos de lectura en el admin.';

CREATE OR REPLACE FUNCTION public.support_chat_mark_last_read(p_message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  msg_user uuid;
BEGIN
  IF uid IS NULL OR p_message_id IS NULL THEN
    RETURN;
  END IF;

  SELECT user_id INTO msg_user FROM public.support_chat_messages WHERE id = p_message_id;
  IF msg_user IS NULL OR msg_user <> uid THEN
    RETURN;
  END IF;

  INSERT INTO public.support_chat_threads (user_id, user_last_read_message_id, updated_at)
  VALUES (uid, p_message_id, now())
  ON CONFLICT (user_id) DO UPDATE
  SET user_last_read_message_id = EXCLUDED.user_last_read_message_id,
      updated_at                  = EXCLUDED.updated_at;
END;
$$;

COMMENT ON FUNCTION public.support_chat_mark_last_read IS
  'Actualiza el puntero de lectura del chat de soporte para el usuario autenticado.';

REVOKE ALL ON FUNCTION public.support_chat_mark_last_read(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.support_chat_mark_last_read(uuid) TO authenticated;

-- El cliente puede "finalizar" el chat sin borrar mensajes: el super admin conserva el historial completo en BD.

ALTER TABLE public.support_chat_threads
  ADD COLUMN IF NOT EXISTS client_reset_after_at timestamptz;

COMMENT ON COLUMN public.support_chat_threads.client_reset_after_at IS
  'Marca temporal: el panel del taller solo muestra mensajes con created_at estrictamente mayor; el historial completo permanece para super admin.';

CREATE OR REPLACE FUNCTION public.support_chat_client_finalize_session()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.support_chat_threads (
    user_id,
    client_reset_after_at,
    bot_active,
    priority,
    status,
    updated_at
  )
  VALUES (uid, now(), true, 'normal', 'open', now())
  ON CONFLICT (user_id) DO UPDATE
  SET client_reset_after_at = now(),
      bot_active            = true,
      priority              = 'normal',
      status                = 'open',
      updated_at            = now();
END;
$$;

COMMENT ON FUNCTION public.support_chat_client_finalize_session IS
  'El usuario del panel marca una nueva sesión de chat visible para él; no elimina filas de mensajes.';

REVOKE ALL ON FUNCTION public.support_chat_client_finalize_session() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.support_chat_client_finalize_session() TO authenticated;

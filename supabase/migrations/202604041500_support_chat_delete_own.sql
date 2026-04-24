-- Permite al usuario del panel borrar su propio historial de soporte (alternativa al borrado vía service role).
DROP POLICY IF EXISTS "support_chat_delete_own" ON public.support_chat_messages;
CREATE POLICY "support_chat_delete_own"
  ON public.support_chat_messages FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

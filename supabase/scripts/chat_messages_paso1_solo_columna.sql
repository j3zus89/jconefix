-- =============================================================================
-- PASO 1 (ejecuta ESTO PRIMERO si te falla todo lo demás)
-- Añade organization_id a chat_messages SIN foreign key (máxima compatibilidad).
-- =============================================================================

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS organization_id uuid;

-- Comprueba que ya existe:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'chat_messages' AND column_name = 'organization_id';

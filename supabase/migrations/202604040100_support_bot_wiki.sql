-- ─────────────────────────────────────────────────────────────────────────────
-- Soporte IA: Wiki del Bot + estado del hilo + flag de mensaje bot
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Extender el CHECK de sender para incluir 'bot' (respuestas automáticas)
ALTER TABLE public.support_chat_messages
  DROP CONSTRAINT IF EXISTS support_chat_messages_sender_check;

ALTER TABLE public.support_chat_messages
  ADD CONSTRAINT support_chat_messages_sender_check
  CHECK (sender IN ('user', 'admin', 'bot'));

-- 2. Columna para distinguir mensajes del bot de respuestas manuales del admin
ALTER TABLE public.support_chat_messages
  ADD COLUMN IF NOT EXISTS is_bot_message boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.support_chat_messages.is_bot_message IS
  'true cuando el mensaje fue generado por el bot IA (Gemini), false = humano.';

-- 3. Wiki del Bot — base de conocimiento que el bot usa como contexto
CREATE TABLE IF NOT EXISTS public.wiki_articles (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text        NOT NULL CHECK (char_length(title) > 0 AND char_length(title) <= 200),
  content     text        NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 5000),
  category    text        NOT NULL DEFAULT 'general',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wiki_articles ENABLE ROW LEVEL SECURITY;
-- Solo service role (super admin) puede leer/escribir — sin políticas públicas.

COMMENT ON TABLE public.wiki_articles IS
  'Artículos de conocimiento que el bot IA usa como contexto para responder soporte.';

-- 4. Estado del hilo de soporte por usuario (bot activo, prioridad, estado)
CREATE TABLE IF NOT EXISTS public.support_chat_threads (
  user_id     uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  bot_active  boolean     NOT NULL DEFAULT true,
  priority    text        NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high')),
  status      text        NOT NULL DEFAULT 'open'   CHECK (status   IN ('open', 'pending', 'resolved')),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_chat_threads ENABLE ROW LEVEL SECURITY;

-- El usuario puede leer el estado de su propio hilo
DROP POLICY IF EXISTS "threads_select_own" ON public.support_chat_threads;
CREATE POLICY "threads_select_own"
  ON public.support_chat_threads FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.support_chat_threads IS
  'Estado del bot por conversación de soporte: bot_active, prioridad y estado del hilo.';

-- 5. Función de búsqueda semántica simple en la Wiki (sin pgvector)
--    Usa ::text para compatibilidad si alguna columna fue creada como jsonb.
CREATE OR REPLACE FUNCTION public.search_wiki_articles(q text, max_results int DEFAULT 3)
RETURNS TABLE(id uuid, title text, content text, category text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, title::text, content::text, category::text
  FROM public.wiki_articles
  WHERE title::text   ILIKE '%' || q || '%'
     OR content::text ILIKE '%' || q || '%'
  ORDER BY
    CASE WHEN title::text ILIKE '%' || q || '%' THEN 0 ELSE 1 END,
    created_at DESC
  LIMIT max_results;
$$;

COMMENT ON FUNCTION public.search_wiki_articles IS
  'Busca artículos de Wiki relevantes para una consulta. Usado por el bot IA.';

-- Índice para acelerar búsquedas por categoría
CREATE INDEX IF NOT EXISTS idx_wiki_articles_category
  ON public.wiki_articles (category);

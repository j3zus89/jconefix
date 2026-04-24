-- ═══════════════════════════════════════════════════════════════════════════
-- Crea las tablas y columnas que el bot necesita (si no existen ya).
-- Ejecuta esto en Supabase → SQL Editor → Run
-- Es seguro correrlo varias veces (usa IF NOT EXISTS).
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Columna is_bot_message en support_chat_messages
ALTER TABLE public.support_chat_messages
  ADD COLUMN IF NOT EXISTS is_bot_message boolean NOT NULL DEFAULT false;

-- 2. Ampliar el CHECK de sender para incluir 'bot'
ALTER TABLE public.support_chat_messages
  DROP CONSTRAINT IF EXISTS support_chat_messages_sender_check;
ALTER TABLE public.support_chat_messages
  ADD CONSTRAINT support_chat_messages_sender_check
  CHECK (sender IN ('user', 'admin', 'bot'));

-- 3. Tabla de estado del hilo (bot_active, prioridad, estado)
CREATE TABLE IF NOT EXISTS public.support_chat_threads (
  user_id    uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  bot_active boolean     NOT NULL DEFAULT true,
  priority   text        NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high')),
  status     text        NOT NULL DEFAULT 'open'   CHECK (status   IN ('open', 'pending', 'resolved')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_chat_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "threads_select_own" ON public.support_chat_threads;
CREATE POLICY "threads_select_own"
  ON public.support_chat_threads FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 4. Verificar
SELECT
  (SELECT COUNT(*) FROM public.wiki_articles)        AS wiki_articles,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='support_chat_threads'
  )                                                   AS threads_table_ok,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='support_chat_messages'
      AND column_name='is_bot_message'
  )                                                   AS is_bot_message_col_ok;

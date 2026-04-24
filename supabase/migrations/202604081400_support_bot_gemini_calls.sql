-- Registro de llamadas a Gemini del bot de soporte (cuotas por usuario).
-- Solo la service role escribe/lee; sin políticas públicas.

CREATE TABLE IF NOT EXISTS public.support_bot_gemini_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_bot_gemini_calls ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.support_bot_gemini_calls IS
  'Una fila por invocación exitosa a Gemini en el chat de soporte; sirve para límites por usuario.';

CREATE INDEX IF NOT EXISTS idx_support_bot_gemini_calls_user_created
  ON public.support_bot_gemini_calls (user_id, created_at DESC);

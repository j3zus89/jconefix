-- Registro de usos de «Pulir con IA» (/api/improve-diagnosis) para límites por usuario.
-- El chat de soporte usa otra tabla y otra clave; esto solo protege la cuota de GEMINI_POLISH_API_KEY.

CREATE TABLE IF NOT EXISTS public.polish_gemini_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.polish_gemini_calls ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.polish_gemini_calls IS
  'Una fila por intento de «Pulir con IA»; sirve para límites por usuario (intervalo, hora, día).';

CREATE INDEX IF NOT EXISTS idx_polish_gemini_calls_user_created
  ON public.polish_gemini_calls (user_id, created_at DESC);

GRANT SELECT, INSERT ON public.polish_gemini_calls TO authenticated;

DROP POLICY IF EXISTS polish_gemini_calls_select_own ON public.polish_gemini_calls;
DROP POLICY IF EXISTS polish_gemini_calls_insert_own ON public.polish_gemini_calls;

CREATE POLICY polish_gemini_calls_select_own
  ON public.polish_gemini_calls FOR SELECT TO authenticated
  USING (auth.uid() = user_id);


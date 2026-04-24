-- Anti-spam: máximo un correo de aviso de login por usuario cada X minutos (lógica en API).
-- Solo service_role escribe/lee; sin políticas → anon/authenticated no tienen acceso.

CREATE TABLE IF NOT EXISTS public.panel_login_email_throttle (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_sent_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_panel_login_email_throttle_sent
  ON public.panel_login_email_throttle (last_sent_at DESC);

ALTER TABLE public.panel_login_email_throttle ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.panel_login_email_throttle IS
  'Último envío de correo «Nueva conexión» por usuario; la API aplica ventana de 30 min.';

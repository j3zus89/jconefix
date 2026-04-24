-- Sesiones del panel por usuario (navegador/dispositivo) para Configuración > Sesiones activas.
-- El cliente envía un client_key estable (localStorage); el servidor registra IP y última actividad.

CREATE TABLE IF NOT EXISTS public.user_panel_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_key text NOT NULL,
  user_agent text,
  ip_address text,
  location_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_panel_sessions_user_client UNIQUE (user_id, client_key)
);

CREATE INDEX IF NOT EXISTS idx_user_panel_sessions_user_last
  ON public.user_panel_sessions (user_id, last_active_at DESC);

COMMENT ON TABLE public.user_panel_sessions IS 'Dispositivos/navegadores con actividad reciente en el panel (heartbeat).';
COMMENT ON COLUMN public.user_panel_sessions.client_key IS 'UUID u otro id estable generado en el navegador (localStorage).';

ALTER TABLE public.user_panel_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_panel_sessions_select_own" ON public.user_panel_sessions;
DROP POLICY IF EXISTS "user_panel_sessions_insert_own" ON public.user_panel_sessions;
DROP POLICY IF EXISTS "user_panel_sessions_update_own" ON public.user_panel_sessions;
DROP POLICY IF EXISTS "user_panel_sessions_delete_own" ON public.user_panel_sessions;

CREATE POLICY "user_panel_sessions_select_own"
  ON public.user_panel_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_panel_sessions_insert_own"
  ON public.user_panel_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_panel_sessions_update_own"
  ON public.user_panel_sessions FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_panel_sessions_delete_own"
  ON public.user_panel_sessions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_panel_sessions TO authenticated;

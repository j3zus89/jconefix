-- Banner global "La voz del dueño": mensaje del super admin visible en el panel de todos los talleres.

CREATE TABLE IF NOT EXISTS public.panel_global_broadcast (
  id smallint PRIMARY KEY DEFAULT 1,
  CONSTRAINT panel_global_broadcast_singleton CHECK (id = 1),
  message text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

INSERT INTO public.panel_global_broadcast (id, message)
VALUES (1, '')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.panel_global_broadcast ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS panel_global_broadcast_select_authenticated ON public.panel_global_broadcast;
CREATE POLICY panel_global_broadcast_select_authenticated
  ON public.panel_global_broadcast FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON TABLE public.panel_global_broadcast IS
  'Mensaje global del super admin en banner superior del panel de talleres (fila id=1). Escritura solo por service role / API admin.';

GRANT SELECT ON public.panel_global_broadcast TO authenticated;

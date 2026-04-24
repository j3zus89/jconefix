-- technicians: columnas que el panel da por existentes (multi-tenant + campana).
-- Idempotente.
ALTER TABLE public.technicians
  ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.technicians
  ADD COLUMN IF NOT EXISTS panel_user_id uuid;

CREATE INDEX IF NOT EXISTS idx_technicians_organization_id
  ON public.technicians (organization_id)
  WHERE organization_id IS NOT NULL;

COMMENT ON COLUMN public.technicians.organization_id IS 'Organización del taller (multi-tenant); nullable en filas legacy.';
COMMENT ON COLUMN public.technicians.panel_user_id IS 'Usuario del panel para notificaciones (campana); ver 202604022103_panel_notifications.';

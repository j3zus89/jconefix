-- Empleados: errores "organization_id" o "panel_user_id" not in schema cache
ALTER TABLE public.technicians
  ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.technicians
  ADD COLUMN IF NOT EXISTS panel_user_id uuid;

CREATE INDEX IF NOT EXISTS idx_technicians_organization_id
  ON public.technicians (organization_id)
  WHERE organization_id IS NOT NULL;

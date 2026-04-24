-- Preferencias de «Controles de seguridad» (PIN por acción / por rol) en panel Ajustes.
ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS security_controls jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.shop_settings.security_controls IS
  'JSON: { "employeePinChecks": { "s1": bool, ... }, "rolePinChecks": { "admin": { "s1": bool }, ... } }';

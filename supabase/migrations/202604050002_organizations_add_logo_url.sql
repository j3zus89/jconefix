-- Logo del taller a nivel organización (p. ej. página pública /check/[id]).
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS logo_url text;

COMMENT ON COLUMN public.organizations.logo_url IS
  'URL pública del logo del taller (Storage). Sincronizada desde ajustes cuando el propietario guarda.';

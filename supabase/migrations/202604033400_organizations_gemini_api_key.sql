-- Añade columna gemini_api_key a organizations para integración con Gemini AI.
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS gemini_api_key text;

COMMENT ON COLUMN public.organizations.gemini_api_key IS
  'Clave de API de Gemini AI por organización (cifrada en tránsito; almacenada en texto).';

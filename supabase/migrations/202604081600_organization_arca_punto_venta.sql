-- Punto de venta AFIP (WSFE) por organización, para prueba de emisión en homologación.

ALTER TABLE public.organization_arca_credentials
  ADD COLUMN IF NOT EXISTS punto_venta integer;

COMMENT ON COLUMN public.organization_arca_credentials.punto_venta IS
  'Número de punto de venta habilitado en AFIP/ARCA para WSFE (ej. 1 para 0001).';

-- Permite que el dueño del taller (AR) autorice cobros con comprobante interno sin CAE AFIP.
ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS ar_allow_invoice_without_afip boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.shop_settings.ar_allow_invoice_without_afip IS
  'Si es true, el equipo puede marcar «sin AFIP» al cobrar tickets (comprobante interno). El dueño lo activa en Ajustes → ARCA/AFIP.';

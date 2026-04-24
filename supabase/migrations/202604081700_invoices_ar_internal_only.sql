-- Facturas AR: comprobante solo interno (sin solicitar CAE en AFIP).

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS ar_internal_only boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.invoices.ar_internal_only IS
  'AR: si true, el comprobante es solo interno del taller (no se solicita CAE en AFIP).';

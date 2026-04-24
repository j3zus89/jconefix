-- Estado del ciclo de vida AFIP para facturas argentinas.
-- Permite tracking preciso: pending (enviando) → afip_approved (CAE) / failed (error)

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS ar_status text
    CHECK (ar_status IN ('pending', 'afip_approved', 'failed'));

COMMENT ON COLUMN public.invoices.ar_status IS
  'Estado AFIP AR: null=sin proceso AFIP, pending=en curso (enviando a AFIP), afip_approved=CAE obtenido, failed=error definitivo.';

-- Índice para la tarea de reconciliación automática
CREATE INDEX IF NOT EXISTS invoices_ar_status_pending
  ON public.invoices (ar_status, organization_id)
  WHERE ar_status = 'pending';

-- Índice para auditoría de fallidos
CREATE INDEX IF NOT EXISTS invoices_ar_status_failed
  ON public.invoices (ar_status, organization_id)
  WHERE ar_status = 'failed';

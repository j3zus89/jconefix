-- Cobros en ticket (efectivo con vuelto, etc.): columnas que ya usa el panel pero faltaban en BD.
-- Sin esto PostgREST devuelve: "Could not find the 'cash_received' column of 'payments' in the schema cache".

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS cash_received DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS change_given DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'completed';

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payments_organization_id
  ON public.payments (organization_id)
  WHERE organization_id IS NOT NULL;

-- Cobro de reparación puede insertarse antes de enlazar factura (luego se actualiza invoice_id).
ALTER TABLE public.payments ALTER COLUMN invoice_id DROP NOT NULL;

COMMENT ON COLUMN public.payments.cash_received IS 'Efectivo entregado por el cliente (si aplica).';
COMMENT ON COLUMN public.payments.change_given IS 'Vuelto entregado (si aplica).';
COMMENT ON COLUMN public.payments.status IS 'Estado del registro de pago (p. ej. completed).';

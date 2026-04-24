-- Devolución al cliente: qué devolver (texto + importe opcional) y cuándo se completó.

ALTER TABLE public.repair_tickets
  ADD COLUMN IF NOT EXISTS return_to_customer_note text,
  ADD COLUMN IF NOT EXISTS return_to_customer_amount numeric(12, 2),
  ADD COLUMN IF NOT EXISTS return_to_customer_recorded_at timestamptz,
  ADD COLUMN IF NOT EXISTS return_to_customer_completed_at timestamptz;

COMMENT ON COLUMN public.repair_tickets.return_to_customer_note IS
  'Descripción libre de qué debe devolverse al cliente (equipo, dinero, accesorios, etc.).';
COMMENT ON COLUMN public.repair_tickets.return_to_customer_amount IS
  'Importe a devolver (opcional); puede quedar vacío si solo aplica equipo o piezas.';
COMMENT ON COLUMN public.repair_tickets.return_to_customer_recorded_at IS
  'Cuándo se registró la obligación de devolución.';
COMMENT ON COLUMN public.repair_tickets.return_to_customer_completed_at IS
  'Cuándo se marcó como entregado/devuelto al cliente.';

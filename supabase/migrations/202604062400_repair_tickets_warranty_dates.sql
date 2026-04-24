-- Período de garantía por orden: fechas que el taller define (no todas las reparaciones duran lo mismo).

ALTER TABLE public.repair_tickets
  ADD COLUMN IF NOT EXISTS warranty_start_date date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS warranty_end_date date DEFAULT NULL;

COMMENT ON COLUMN public.repair_tickets.warranty_start_date IS
  'Inicio del período de garantía comercial (fecha local del taller).';
COMMENT ON COLUMN public.repair_tickets.warranty_end_date IS
  'Fin del período de garantía (inclusive). Junto con warranty_start_date alimenta la vista Garantías.';

CREATE INDEX IF NOT EXISTS idx_repair_tickets_warranty_end_date
  ON public.repair_tickets (warranty_end_date)
  WHERE warranty_end_date IS NOT NULL;

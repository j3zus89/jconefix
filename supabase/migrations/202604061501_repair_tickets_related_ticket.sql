-- Reingreso / garantía: enlace al ticket anterior (mismo equipo, devolución, seguimiento).

ALTER TABLE public.repair_tickets
  ADD COLUMN IF NOT EXISTS related_ticket_id uuid REFERENCES public.repair_tickets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_repair_tickets_related_ticket_id
  ON public.repair_tickets(related_ticket_id)
  WHERE related_ticket_id IS NOT NULL;

COMMENT ON COLUMN public.repair_tickets.related_ticket_id IS
  'Boleto anterior al que corresponde este ingreso (garantía, reingreso, devolución). ON DELETE SET NULL si se borra el ticket padre.';

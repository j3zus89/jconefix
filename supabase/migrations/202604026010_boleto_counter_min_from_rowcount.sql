-- Si todos los ticket_number son no numéricos, el seed del contador podía quedar < filas existentes.
-- GREATEST(counter, count(*)) evita colisiones con 0-0001… ya usados.

UPDATE public.organization_boleto_counter c
SET counter = GREATEST(
  c.counter,
  (SELECT COUNT(*)::bigint FROM public.repair_tickets r WHERE r.organization_id = c.organization_id)
);

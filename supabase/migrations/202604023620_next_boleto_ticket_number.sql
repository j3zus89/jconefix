/*
  Boletos en orden: 0-0001, 0-0002, … por organización (taller).
  - Sustituye la unicidad global de ticket_number por (organization_id, ticket_number).
  - RPC atómica con bloqueo por taller para evitar duplicados concurrentes.
*/

ALTER TABLE public.repair_tickets
  DROP CONSTRAINT IF EXISTS repair_tickets_ticket_number_key;

CREATE UNIQUE INDEX IF NOT EXISTS repair_tickets_org_ticket_number_uniq
  ON public.repair_tickets (organization_id, ticket_number)
  WHERE organization_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS repair_tickets_ticket_number_null_org_uniq
  ON public.repair_tickets (ticket_number)
  WHERE organization_id IS NULL;

CREATE OR REPLACE FUNCTION public.next_boleto_ticket_number(p_organization_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max integer;
  v_next integer;
BEGIN
  IF p_organization_id IS NULL THEN
    RAISE EXCEPTION 'organization_id requerido';
  END IF;

  IF NOT public.user_belongs_to_org(p_organization_id) THEN
    RAISE EXCEPTION 'no autorizado';
  END IF;

  PERFORM pg_advisory_xact_lock(abs(hashtext(p_organization_id::text))::bigint);

  SELECT COALESCE(
    MAX((regexp_match(ticket_number, '^0-([0-9]+)$'))[1]::integer),
    0
  )
  INTO v_max
  FROM public.repair_tickets
  WHERE organization_id = p_organization_id;

  v_next := v_max + 1;

  RETURN '0-' || lpad(v_next::text, 4, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.next_boleto_ticket_number(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_boleto_ticket_number(uuid) TO authenticated;

COMMENT ON FUNCTION public.next_boleto_ticket_number(uuid) IS
  'Siguiente número de boleto 0-0001… por organization_id (exclusivo por taller).';

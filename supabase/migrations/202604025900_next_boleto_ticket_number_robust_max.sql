-- Siguiente boleto: el MAX solo consideraba '^0-([0-9]+)$'. Boletos viejos u otros formatos
-- no sumaban → v_max = 0 siempre → cada alta intentaba 0-0001 → duplicate key por org.

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

  SELECT COALESCE(MAX(
    CASE
      WHEN ticket_number ~ '^0-[0-9]+$' THEN substring(ticket_number from 3)::integer
      WHEN ticket_number ~ '^[0-9]+$' THEN ticket_number::integer
      WHEN ticket_number ~ '[0-9]+$' THEN (regexp_match(ticket_number, '([0-9]+)$'))[1]::integer
      ELSE NULL
    END
  ), 0)
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
  'Siguiente boleto 0-0001… por organization_id; MAX robusto (0-NNNN, solo dígitos, sufijo numérico).';

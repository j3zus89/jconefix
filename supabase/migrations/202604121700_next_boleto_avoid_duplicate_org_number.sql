-- El contador en organization_boleto_counter puede quedar por debajo del máximo real en
-- repair_tickets (importaciones, datos viejos, huecos) → next_boleto devolvía 0-0003 aunque
-- ya existía 0-0125 → duplicate key repair_tickets_org_ticket_number_uniq.
--
-- Bajo advisory lock: siguiente = GREATEST(contador persistido, MAX parseado en tickets) + 1.
-- Si no hay tickets, el siguiente es 1 (reinicia contador coherente con primer alta).

CREATE OR REPLACE FUNCTION public.next_boleto_ticket_number(
  p_organization_id uuid,
  p_style text DEFAULT 'padded_four'
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max bigint;
  v_counter bigint;
  v_next bigint;
  v_style text;
  v_ticket_count bigint;
BEGIN
  IF p_organization_id IS NULL THEN
    RAISE EXCEPTION 'organization_id requerido';
  END IF;

  IF NOT public.user_belongs_to_org(p_organization_id) THEN
    RAISE EXCEPTION 'no autorizado';
  END IF;

  v_style := lower(trim(COALESCE(p_style, '')));
  IF v_style = '' THEN
    v_style := 'padded_four';
  END IF;
  IF v_style NOT IN ('padded_four', 'minimal') THEN
    v_style := 'padded_four';
  END IF;

  PERFORM pg_advisory_xact_lock(abs(hashtext(p_organization_id::text))::bigint);

  SELECT COUNT(*)::bigint
  INTO v_ticket_count
  FROM public.repair_tickets
  WHERE organization_id = p_organization_id;

  SELECT COALESCE(MAX(
    CASE
      WHEN ticket_number ~ '^0-[0-9]+$' THEN substring(ticket_number from 3)::bigint
      WHEN ticket_number ~ '^[0-9]+$' THEN ticket_number::bigint
      WHEN ticket_number ~ '[0-9]+$' THEN (regexp_match(ticket_number, '([0-9]+)$'))[1]::bigint
      ELSE NULL
    END
  ), 0)::bigint
  INTO v_max
  FROM public.repair_tickets
  WHERE organization_id = p_organization_id;

  SELECT COALESCE(
    (SELECT counter FROM public.organization_boleto_counter WHERE organization_id = p_organization_id),
    0::bigint
  )
  INTO v_counter;

  IF v_ticket_count = 0 THEN
    v_next := 1;
  ELSE
    v_next := GREATEST(v_counter, v_max) + 1;
  END IF;

  INSERT INTO public.organization_boleto_counter (organization_id, counter)
  VALUES (p_organization_id, v_next)
  ON CONFLICT (organization_id) DO UPDATE
  SET counter = EXCLUDED.counter
  RETURNING counter INTO v_next;

  IF v_next IS NULL THEN
    RAISE EXCEPTION 'contador de boletos no disponible';
  END IF;

  IF v_style = 'minimal' THEN
    RETURN '0-' || v_next::text;
  END IF;

  RETURN '0-' || lpad(v_next::text, 4, '0');
END;
$$;

COMMENT ON FUNCTION public.next_boleto_ticket_number(uuid, text) IS
  'Siguiente boleto por org; evita duplicados frente a importaciones (GREATEST contador vs MAX tickets).';

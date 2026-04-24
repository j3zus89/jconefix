-- Alinea organization_boleto_counter cuando el taller no tiene tickets (contador huérfano → primer alta 0-0001).
-- Idempotente: reemplaza la función (uuid, text) ya desplegada.

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

  SELECT COUNT(*)::bigint
  INTO v_ticket_count
  FROM public.repair_tickets
  WHERE organization_id = p_organization_id;

  IF v_ticket_count = 0 THEN
    UPDATE public.organization_boleto_counter
    SET counter = 0
    WHERE organization_id = p_organization_id;
  END IF;

  INSERT INTO public.organization_boleto_counter (organization_id, counter)
  VALUES (p_organization_id, 1)
  ON CONFLICT (organization_id) DO UPDATE
  SET counter = public.organization_boleto_counter.counter + 1
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
  'Siguiente boleto; resetea contador si no hay tickets; p_style padded_four o minimal.';

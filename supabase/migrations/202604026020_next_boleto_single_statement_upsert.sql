-- Un solo INSERT…ON CONFLICT DO UPDATE incrementa y devuelve el valor en la misma sentencia atómica.
-- Evita condiciones de carrera entre INSERT dummy + UPDATE que en carga alta repetían el mismo número.

CREATE OR REPLACE FUNCTION public.next_boleto_ticket_number(p_organization_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next bigint;
BEGIN
  IF p_organization_id IS NULL THEN
    RAISE EXCEPTION 'organization_id requerido';
  END IF;

  IF NOT public.user_belongs_to_org(p_organization_id) THEN
    RAISE EXCEPTION 'no autorizado';
  END IF;

  INSERT INTO public.organization_boleto_counter (organization_id, counter)
  VALUES (p_organization_id, 1)
  ON CONFLICT (organization_id) DO UPDATE
  SET counter = public.organization_boleto_counter.counter + 1
  RETURNING counter INTO v_next;

  IF v_next IS NULL THEN
    RAISE EXCEPTION 'contador de boletos no disponible';
  END IF;

  RETURN '0-' || lpad(v_next::text, 4, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.next_boleto_ticket_number(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_boleto_ticket_number(uuid) TO authenticated;

COMMENT ON FUNCTION public.next_boleto_ticket_number(uuid) IS
  'Siguiente boleto: incremento atómico vía UPSERT en organization_boleto_counter.';

-- Contador dedicado por taller: el MAX sobre ticket_number fallaba con formatos raros o huecos.
-- UPDATE ... counter + 1 bajo advisory lock = sin duplicados aunque crees 20 órgenes seguidas.

CREATE TABLE IF NOT EXISTS public.organization_boleto_counter (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  counter bigint NOT NULL DEFAULT 0
);

ALTER TABLE public.organization_boleto_counter ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.organization_boleto_counter FROM PUBLIC;
REVOKE ALL ON TABLE public.organization_boleto_counter FROM authenticated;
REVOKE ALL ON TABLE public.organization_boleto_counter FROM anon;

-- Sembrar con el máximo numérico ya existente por org (misma lógica que la versión anterior).
WITH per_org AS (
  SELECT
    rt.organization_id,
    COALESCE(MAX(
      CASE
        WHEN rt.ticket_number ~ '^0-[0-9]+$' THEN substring(rt.ticket_number from 3)::bigint
        WHEN rt.ticket_number ~ '^[0-9]+$' THEN rt.ticket_number::bigint
        WHEN rt.ticket_number ~ '[0-9]+$' THEN (regexp_match(rt.ticket_number, '([0-9]+)$'))[1]::bigint
        ELSE NULL
      END
    ), 0::bigint) AS mx
  FROM public.repair_tickets rt
  WHERE rt.organization_id IS NOT NULL
  GROUP BY rt.organization_id
)
INSERT INTO public.organization_boleto_counter (organization_id, counter)
SELECT organization_id, mx FROM per_org
ON CONFLICT (organization_id) DO UPDATE
SET counter = GREATEST(public.organization_boleto_counter.counter, EXCLUDED.counter);

-- Orgs sin tickets aún: fila en 0 para el primer incremento.
INSERT INTO public.organization_boleto_counter (organization_id, counter)
SELECT o.id, 0
FROM public.organizations o
WHERE o.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.organization_boleto_counter c WHERE c.organization_id = o.id
  )
ON CONFLICT (organization_id) DO NOTHING;

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

  PERFORM pg_advisory_xact_lock(abs(hashtext(p_organization_id::text))::bigint);

  INSERT INTO public.organization_boleto_counter (organization_id, counter)
  VALUES (p_organization_id, 0)
  ON CONFLICT (organization_id) DO NOTHING;

  UPDATE public.organization_boleto_counter
  SET counter = counter + 1
  WHERE organization_id = p_organization_id
  RETURNING counter INTO v_next;

  IF v_next IS NULL THEN
    RAISE EXCEPTION 'contador de boletos no disponible';
  END IF;

  RETURN '0-' || lpad(v_next::text, 4, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.next_boleto_ticket_number(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_boleto_ticket_number(uuid) TO authenticated;

COMMENT ON TABLE public.organization_boleto_counter IS
  'Siguiente número entero por boleto (por organization_id); usado solo vía next_boleto_ticket_number().';

COMMENT ON FUNCTION public.next_boleto_ticket_number(uuid) IS
  'Reserva atómicamente el siguiente boleto 0-0001… (contador + advisory lock por taller).';

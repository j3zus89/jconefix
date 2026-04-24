-- Órdenes sin organization_id: asignar taller desde membresía activa del creador (user_id).

UPDATE public.repair_tickets rt
SET organization_id = x.org_id
FROM (
  SELECT
    rt2.id AS ticket_id,
    (
      SELECT om.organization_id
      FROM public.organization_members om
      WHERE om.user_id = rt2.user_id
        AND om.is_active = true
        AND om.organization_id IS NOT NULL
      ORDER BY om.created_at ASC NULLS LAST
      LIMIT 1
    ) AS org_id
  FROM public.repair_tickets rt2
  WHERE rt2.organization_id IS NULL
) x
WHERE rt.id = x.ticket_id
  AND x.org_id IS NOT NULL;

-- Legacy: creador es owner_id de la organización sin fila en members
UPDATE public.repair_tickets rt
SET organization_id = o.id
FROM public.organizations o
WHERE rt.organization_id IS NULL
  AND o.owner_id = rt.user_id;

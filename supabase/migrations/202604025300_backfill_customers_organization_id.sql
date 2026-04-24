-- Unificar clientes con la organización del creador (datos previos a organization_id en clientes).

UPDATE public.customers c
SET organization_id = p.organization_id
FROM public.profiles p
WHERE c.organization_id IS NULL
  AND c.user_id = p.id
  AND p.organization_id IS NOT NULL;

-- Resto: primera membresía activa del creador (mismo criterio estable que getActiveOrganizationId).
UPDATE public.customers c
SET organization_id = sub.organization_id
FROM (
  SELECT DISTINCT ON (user_id)
    user_id,
    organization_id
  FROM public.organization_members
  WHERE is_active = true
  ORDER BY user_id, organization_id ASC
) sub
WHERE c.organization_id IS NULL
  AND c.user_id = sub.user_id;

-- Dueño de `organizations`: misma lógica de pertenencia que un miembro activo.
-- Evita panel vacío ("No hay organización activa") y RLS que bloquea clientes/tickets
-- cuando existe la org y `owner_id` pero falta (o aún no hay) fila en `organization_members`.

CREATE OR REPLACE FUNCTION public.user_belongs_to_org(org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND is_active = true
  )
  OR EXISTS (
    SELECT 1
    FROM public.organizations o
    WHERE o.id = org_id
      AND o.owner_id = auth.uid()
      AND o.deleted_at IS NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id uuid;
BEGIN
  SELECT om.organization_id INTO org_id
  FROM public.organization_members om
  WHERE om.user_id = auth.uid()
    AND om.is_active = true
  ORDER BY om.joined_at ASC
  LIMIT 1;

  IF org_id IS NOT NULL THEN
    RETURN org_id;
  END IF;

  SELECT o.id INTO org_id
  FROM public.organizations o
  WHERE o.owner_id = auth.uid()
    AND o.deleted_at IS NULL
  ORDER BY o.created_at ASC
  LIMIT 1;

  RETURN org_id;
END;
$$;

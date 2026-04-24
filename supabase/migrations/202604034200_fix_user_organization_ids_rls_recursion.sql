-- Recursión infinita en RLS de organization_members:
--   members_select_own usa user_organization_ids(), que hace SELECT sobre
--   organization_members → se vuelve a aplicar members_select_own → error Postgres.
-- Solución: en funciones SECURITY DEFINER que solo filtran por auth.uid(),
--   desactivar RLS en el cuerpo (equivalente a leer con privilegios del definer).

CREATE OR REPLACE FUNCTION public.user_organization_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT organization_id
  FROM public.organization_members
  WHERE user_id = auth.uid()
    AND is_active = true;
$$;

GRANT EXECUTE ON FUNCTION public.user_organization_ids() TO authenticated;

CREATE OR REPLACE FUNCTION public.user_belongs_to_org(org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
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
SET row_security = off
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

-- Políticas legacy que conviven con members_* y provocan recursión (EXISTS sobre organization_members).
DROP POLICY IF EXISTS "Users can view members of their organizations" ON public.organization_members;
DROP POLICY IF EXISTS "Owners and admins can insert members" ON public.organization_members;
DROP POLICY IF EXISTS "Owners and admins can update members" ON public.organization_members;
DROP POLICY IF EXISTS "Owners and admins can delete members" ON public.organization_members;

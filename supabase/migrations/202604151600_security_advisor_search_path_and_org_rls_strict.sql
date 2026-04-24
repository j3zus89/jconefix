-- =============================================================================
-- Security Advisor: search_path fijo en funciones public + RLS más estricto en orgs
-- =============================================================================
-- 1) Function Search Path Mutable
--     Recorre funciones y procedimientos en public y fija search_path = public, auth
--     (auth hace falta para helpers que lean auth.users, p. ej. is_super_admin).
-- 2) RLS Policy "Always True" (típico en INSERT demasiado permisivo)
--     - organizations: orgs_insert_authenticated usaba WITH CHECK (auth.uid() IS NOT NULL)
--       → cualquier usuario logueado podía insertar filas; se restringe a owner_id = auth.uid().
--     - Consolida nombres de políticas y elimina duplicados legacy conocidos.
-- =============================================================================

-- ─── A) search_path en todas las rutinas public que no lo fijan ya ───────────
DO $$
DECLARE
  r record;
  v_sql text;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS fn_sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND (
        p.proconfig IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM unnest(p.proconfig) AS c(val)
          WHERE val LIKE 'search_path=%'
        )
      )
  LOOP
    BEGIN
      v_sql := format('ALTER FUNCTION %s SET search_path = public, auth', r.fn_sig);
      EXECUTE v_sql;
      RAISE NOTICE '[search_path] %', r.fn_sig;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '[search_path skip] % → %', r.fn_sig, SQLERRM;
    END;
  END LOOP;
END $$;

-- ─── B) organizations: quitar políticas duplicadas / legacy y recrear ───────
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owners can update their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can delete organizations" ON public.organizations;
DROP POLICY IF EXISTS "orgs_select_member" ON public.organizations;
DROP POLICY IF EXISTS "orgs_update_owner" ON public.organizations;
DROP POLICY IF EXISTS "orgs_insert_authenticated" ON public.organizations;
DROP POLICY IF EXISTS "orgs_delete_owner" ON public.organizations;

CREATE POLICY "orgs_select_member" ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR id IN (SELECT public.user_organization_ids())
    OR owner_id = auth.uid()
  );

CREATE POLICY "orgs_update_owner" ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (public.is_super_admin() OR owner_id = auth.uid())
  WITH CHECK (public.is_super_admin() OR owner_id = auth.uid());

-- Antes: auth.uid() IS NOT NULL → "Always true" para cualquier fila insertada por un logueado.
CREATE POLICY "orgs_insert_authenticated" ON public.organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND owner_id = auth.uid()
  );

CREATE POLICY "orgs_delete_owner" ON public.organizations
  FOR DELETE
  TO authenticated
  USING (false);

-- ─── C) organization_members: mismo barrido + políticas alineadas ───────────
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view members of their organizations" ON public.organization_members;
DROP POLICY IF EXISTS "Owners and admins can insert members" ON public.organization_members;
DROP POLICY IF EXISTS "Owners and admins can update members" ON public.organization_members;
DROP POLICY IF EXISTS "Owners and admins can delete members" ON public.organization_members;
DROP POLICY IF EXISTS "members_select_own" ON public.organization_members;
DROP POLICY IF EXISTS "members_insert_owner" ON public.organization_members;
DROP POLICY IF EXISTS "members_update_owner" ON public.organization_members;
DROP POLICY IF EXISTS "members_delete_owner" ON public.organization_members;

CREATE POLICY "members_select_own" ON public.organization_members
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR organization_id IN (SELECT public.user_organization_ids())
    OR user_id = auth.uid()
  );

CREATE POLICY "members_insert_owner" ON public.organization_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = organization_id
        AND o.owner_id = auth.uid()
        AND o.deleted_at IS NULL
    )
  );

CREATE POLICY "members_update_owner" ON public.organization_members
  FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = organization_id
        AND o.owner_id = auth.uid()
        AND o.deleted_at IS NULL
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = organization_id
        AND o.owner_id = auth.uid()
        AND o.deleted_at IS NULL
    )
  );

CREATE POLICY "members_delete_owner" ON public.organization_members
  FOR DELETE
  TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = organization_id
        AND o.owner_id = auth.uid()
        AND o.deleted_at IS NULL
    )
  );

COMMENT ON POLICY "orgs_insert_authenticated" ON public.organizations IS
  'Solo el usuario que figura como owner_id puede crear la fila (evita WITH CHECK demasiado permisivo).';

-- =============================================================================
-- Seguimiento al CSV "Supabase Performance Security Lints"
-- (function_search_path_mutable, rls_policy_always_true, public_bucket_allows_listing)
-- =============================================================================
-- A) Políticas RLS permisivas detectadas en producción (nombres del reporte CSV).
--    Son típicas de SQL manual / pruebas ("Temp access", *_insert_all, WITH CHECK true).
-- B) search_path fijo en las 15 funciones que el linter sigue nombrando (por si el
--    barrido masivo de 202604151600 no las alcanzó o hay overloads).
-- C) Bucket avatars (lint 0025): ver migración 202604151900_avatars_select_policy_splinter_0025.sql
-- D) leaked password protection: ver comentarios en supabase/config.toml junto a [auth]
--    (en hosted: Dashboard → Authentication → Email; requiere plan Pro+).
-- =============================================================================

-- ─── A) Quitar políticas permisivas (CSV) + re-aplicar el set estricto de orgs ─
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Nombres exactos del CSV / SQL ad-hoc
DROP POLICY IF EXISTS "Temp access members" ON public.organization_members;
DROP POLICY IF EXISTS "org_members_insert_all" ON public.organization_members;
DROP POLICY IF EXISTS "Authenticated can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Super admin or owners can update organizations" ON public.organizations;
DROP POLICY IF EXISTS "Temp access" ON public.organizations;
DROP POLICY IF EXISTS "organizations_insert_all" ON public.organizations;
DROP POLICY IF EXISTS "organizations_update_all" ON public.organizations;

-- Limpieza alineada con migración 202604151600 (idempotente)
DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owners can update their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can delete organizations" ON public.organizations;
DROP POLICY IF EXISTS "orgs_select_member" ON public.organizations;
DROP POLICY IF EXISTS "orgs_update_owner" ON public.organizations;
DROP POLICY IF EXISTS "orgs_insert_authenticated" ON public.organizations;
DROP POLICY IF EXISTS "orgs_delete_owner" ON public.organizations;

DROP POLICY IF EXISTS "Users can view members of their organizations" ON public.organization_members;
DROP POLICY IF EXISTS "Owners and admins can insert members" ON public.organization_members;
DROP POLICY IF EXISTS "Owners and admins can update members" ON public.organization_members;
DROP POLICY IF EXISTS "Owners and admins can delete members" ON public.organization_members;
DROP POLICY IF EXISTS "members_select_own" ON public.organization_members;
DROP POLICY IF EXISTS "members_insert_owner" ON public.organization_members;
DROP POLICY IF EXISTS "members_update_owner" ON public.organization_members;
DROP POLICY IF EXISTS "members_delete_owner" ON public.organization_members;

CREATE POLICY "orgs_select_member" ON public.organizations
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR id IN (SELECT public.user_organization_ids())
    OR owner_id = auth.uid()
  );

CREATE POLICY "orgs_update_owner" ON public.organizations
  FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR owner_id = auth.uid())
  WITH CHECK (public.is_super_admin() OR owner_id = auth.uid());

CREATE POLICY "orgs_insert_authenticated" ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND owner_id = auth.uid());

CREATE POLICY "orgs_delete_owner" ON public.organizations
  FOR DELETE TO authenticated
  USING (false);

CREATE POLICY "members_select_own" ON public.organization_members
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR organization_id IN (SELECT public.user_organization_ids())
    OR user_id = auth.uid()
  );

CREATE POLICY "members_insert_owner" ON public.organization_members
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_id AND o.owner_id = auth.uid() AND o.deleted_at IS NULL
    )
  );

CREATE POLICY "members_update_owner" ON public.organization_members
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_id AND o.owner_id = auth.uid() AND o.deleted_at IS NULL
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_id AND o.owner_id = auth.uid() AND o.deleted_at IS NULL
    )
  );

CREATE POLICY "members_delete_owner" ON public.organization_members
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_id AND o.owner_id = auth.uid() AND o.deleted_at IS NULL
    )
  );

-- ─── B) Funciones nombradas en el CSV (search_path) ───────────────────────────
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS fn_sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.proname = ANY (
        ARRAY[
          'get_all_organizations',
          'create_organization_owner_member',
          'generate_invoice_number',
          'ticket_comments_before_insert',
          'delete_organization',
          'generate_org_slug',
          'create_default_ticket_accessories',
          'is_super_admin',
          'get_user_role_in_org',
          'set_customer_return_reference_code',
          'touch_customer_return_constancia',
          'get_super_admin_id',
          'log_super_admin_action',
          'update_updated_at_column',
          'ticket_comments_before_update'
        ]
      )
  LOOP
    BEGIN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, auth', r.fn_sig);
      RAISE NOTICE '[search_path CSV] %', r.fn_sig;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '[search_path CSV skip] % → %', r.fn_sig, SQLERRM;
    END;
  END LOOP;
END $$;

-- =============================================================================
-- Seguimiento CSV "Supabase Performance Security Lints" (1)
-- duplicate_index | multiple_permissive_policies (parcial) | auth_rls_initplan (parcial)
-- =============================================================================
-- A) Índices duplicados (lint 0009): mismo predicado, distinto nombre.
-- B) chat_messages: quita políticas duplicadas / legacy (p. ej. chat_select con
--    USING true + chat_messages_*_org + "Org members…") y deja un solo set con
--    TO authenticated y auth envuelto en (select …) donde aplica initplan.
-- C) organizations / organization_members: quita políticas permisivas extra
--    que suelen coexistir con orgs_select_member / members_select_own (CSV).
-- El resto de initplan / múltiples políticas por tabla queda para migraciones
-- posteriores o consolidación manual (190 + 205 filas).
-- =============================================================================

-- ─── A) Índices duplicados ───────────────────────────────────────────────────
DROP INDEX IF EXISTS public.idx_customers_user;
DROP INDEX IF EXISTS public.idx_inventory_user;
DROP INDEX IF EXISTS public.idx_org_members_org;
DROP INDEX IF EXISTS public.idx_org_members_user;
DROP INDEX IF EXISTS public.idx_organizations_owner;
DROP INDEX IF EXISTS public.idx_tickets_user;
DROP INDEX IF EXISTS public.idx_tickets_customer;
DROP INDEX IF EXISTS public.idx_tickets_status;
DROP INDEX IF EXISTS public.idx_tickets_number;

-- ─── B) chat_messages: unificar RLS + initplan-friendly ─────────────────────
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_select" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_insert" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_select_org" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert_org" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_delete_own" ON public.chat_messages;
DROP POLICY IF EXISTS "Org members can read chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Org members can insert own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can delete own org chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Authenticated users can read chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Authenticated users can insert chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can delete own chat messages" ON public.chat_messages;

CREATE POLICY "Org members can read chat messages"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (
    (select public.is_super_admin())
    OR (
      organization_id IS NOT NULL
      AND public.user_belongs_to_org(organization_id)
    )
  );

CREATE POLICY "Org members can insert own chat messages"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    (select auth.uid()) = user_id
    AND organization_id IS NOT NULL
    AND public.user_belongs_to_org(organization_id)
  );

CREATE POLICY "Users can delete own org chat messages"
  ON public.chat_messages FOR DELETE
  TO authenticated
  USING (
    (select public.is_super_admin())
    OR (
      (select auth.uid()) = user_id
      AND organization_id IS NOT NULL
      AND public.user_belongs_to_org(organization_id)
    )
  );

-- ─── C) organizations / organization_members: nombres extra del CSV ────────
DROP POLICY IF EXISTS "organizations_select_all" ON public.organizations;
DROP POLICY IF EXISTS "org_members_select_all" ON public.organization_members;
DROP POLICY IF EXISTS "Super admin or owners can view organizations" ON public.organizations;

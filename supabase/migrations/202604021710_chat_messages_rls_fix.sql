-- ⚠️ NO ejecutes este archivo si chat_messages aún NO tiene la columna organization_id.
--    Primero: 20260402002_scope_chat_by_organization.sql o 202604021800_chat_messages_ensure_organization_id.sql
--
-- Chat interno: las políticas con EXISTS directo sobre organization_members fallan porque
-- el sub-SELECT vuelve a aplicar RLS sobre organization_members (recursión / filas no visibles).
-- Misma solución que repair_tickets / invoices: user_belongs_to_org() (SECURITY DEFINER).

DROP POLICY IF EXISTS "Org members can read chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Org members can insert own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can delete own org chat messages" ON public.chat_messages;

CREATE POLICY "Org members can read chat messages"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (
    is_super_admin()
    OR (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
  );

CREATE POLICY "Org members can insert own chat messages"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND organization_id IS NOT NULL
    AND user_belongs_to_org(organization_id)
  );

CREATE POLICY "Users can delete own org chat messages"
  ON public.chat_messages FOR DELETE
  TO authenticated
  USING (
    is_super_admin()
    OR (
      auth.uid() = user_id
      AND organization_id IS NOT NULL
      AND user_belongs_to_org(organization_id)
    )
  );

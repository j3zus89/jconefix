-- Chat por organización: columna + backfill + RLS (idempotente).
-- Si antes ejecutaste solo 202604021710_* sin 02002, te faltaba la columna.
--
-- La columna se crea SIN REFERENCES en la misma sentencia por compatibilidad;
-- luego se añade la FK por separado.

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_organization_id_fkey;

ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

UPDATE public.chat_messages cm
SET organization_id = om.organization_id
FROM public.organization_members om
WHERE cm.organization_id IS NULL
  AND om.user_id = cm.user_id
  AND om.is_active = true;

UPDATE public.chat_messages cm
SET organization_id = o.id
FROM public.organizations o
WHERE cm.organization_id IS NULL
  AND o.owner_id = cm.user_id;

DROP POLICY IF EXISTS "Authenticated users can read chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Authenticated users can insert chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can delete own chat messages" ON public.chat_messages;
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

CREATE INDEX IF NOT EXISTS chat_messages_org_created_idx
  ON public.chat_messages(organization_id, created_at DESC);

/*
  Scope internal chat by organization to avoid cross-tenant leakage.
*/

ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- Backfill using active organization membership.
UPDATE chat_messages cm
SET organization_id = om.organization_id
FROM organization_members om
WHERE cm.organization_id IS NULL
  AND om.user_id = cm.user_id
  AND om.is_active = true;

-- Fallback for organization owners (legacy rows without membership match).
UPDATE chat_messages cm
SET organization_id = o.id
FROM organizations o
WHERE cm.organization_id IS NULL
  AND o.owner_id = cm.user_id;

DROP POLICY IF EXISTS "Authenticated users can read chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Authenticated users can insert chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can delete own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Org members can read chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Org members can insert own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can delete own org chat messages" ON chat_messages;

CREATE POLICY "Org members can read chat messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM organization_members om
      WHERE om.organization_id = chat_messages.organization_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
    )
  );

CREATE POLICY "Org members can insert own chat messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM organization_members om
      WHERE om.organization_id = chat_messages.organization_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
    )
  );

CREATE POLICY "Users can delete own org chat messages"
  ON chat_messages FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM organization_members om
      WHERE om.organization_id = chat_messages.organization_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
    )
  );

CREATE INDEX IF NOT EXISTS chat_messages_org_created_idx
  ON chat_messages(organization_id, created_at DESC);


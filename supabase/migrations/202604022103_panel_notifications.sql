/*
  In-app panel notifications (campana): avisos cuando se asigna un ticket a un técnico
  enlazado a un usuario del panel (technicians.panel_user_id).
*/

CREATE TABLE IF NOT EXISTS panel_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'ticket_assigned',
  title text NOT NULL,
  body text,
  ticket_id uuid REFERENCES repair_tickets(id) ON DELETE CASCADE,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_panel_notifications_user_created
  ON panel_notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_panel_notifications_user_unread
  ON panel_notifications (user_id)
  WHERE read_at IS NULL;

ALTER TABLE technicians
  ADD COLUMN IF NOT EXISTS panel_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN technicians.panel_user_id IS 'Usuario del panel que recibe notificaciones (campana) cuando este empleado es asignado a un ticket';

ALTER TABLE panel_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "panel_notifications_select_own" ON panel_notifications;
CREATE POLICY "panel_notifications_select_own"
  ON panel_notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "panel_notifications_update_own" ON panel_notifications;
CREATE POLICY "panel_notifications_update_own"
  ON panel_notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "panel_notifications_insert_for_org_member" ON panel_notifications;
CREATE POLICY "panel_notifications_insert_for_org_member"
  ON panel_notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    user_belongs_to_org(organization_id)
    AND EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = panel_notifications.organization_id
        AND om.user_id = panel_notifications.user_id
        AND om.is_active = true
    )
  );

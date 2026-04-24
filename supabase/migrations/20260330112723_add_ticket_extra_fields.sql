/*
  # Add extra fields to repair_tickets

  Adds fields visible in the reference screenshots:
  - assigned_to: technician assigned to the ticket
  - task_type: TIENDA, ONLINE, etc.
  - due_date: fecha de vencimiento
  - repair_time: tiempo de reparación acumulado
  - warranty_info: información de garantía
  - pin_pattern: pin o patrón del dispositivo
  - is_urgent: marcado como urgente
  - is_draft: borrador
  - imei: IMEI del dispositivo
  - device_category: categoria (SMARTPHONES, TABLETS, etc.)
  - device_brand: marca (APPLE, SAMSUNG, etc.)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'repair_tickets' AND column_name = 'assigned_to'
  ) THEN
    ALTER TABLE repair_tickets ADD COLUMN assigned_to text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'repair_tickets' AND column_name = 'task_type'
  ) THEN
    ALTER TABLE repair_tickets ADD COLUMN task_type text DEFAULT 'TIENDA';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'repair_tickets' AND column_name = 'due_date'
  ) THEN
    ALTER TABLE repair_tickets ADD COLUMN due_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'repair_tickets' AND column_name = 'is_urgent'
  ) THEN
    ALTER TABLE repair_tickets ADD COLUMN is_urgent boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'repair_tickets' AND column_name = 'is_draft'
  ) THEN
    ALTER TABLE repair_tickets ADD COLUMN is_draft boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'repair_tickets' AND column_name = 'imei'
  ) THEN
    ALTER TABLE repair_tickets ADD COLUMN imei text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'repair_tickets' AND column_name = 'device_category'
  ) THEN
    ALTER TABLE repair_tickets ADD COLUMN device_category text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'repair_tickets' AND column_name = 'device_brand'
  ) THEN
    ALTER TABLE repair_tickets ADD COLUMN device_brand text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'repair_tickets' AND column_name = 'pin_pattern'
  ) THEN
    ALTER TABLE repair_tickets ADD COLUMN pin_pattern text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'repair_tickets' AND column_name = 'warranty_info'
  ) THEN
    ALTER TABLE repair_tickets ADD COLUMN warranty_info text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'repair_tickets' AND column_name = 'diagnostic_notes'
  ) THEN
    ALTER TABLE repair_tickets ADD COLUMN diagnostic_notes text;
  END IF;
END $$;

/*
  # Create ticket_comments table

  For the activity log / comments section at the bottom of each ticket.
*/

CREATE TABLE IF NOT EXISTS ticket_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES repair_tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT '',
  content text NOT NULL,
  is_private boolean DEFAULT false,
  comment_type text DEFAULT 'comment',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view comments on own tickets" ON ticket_comments;
DROP POLICY IF EXISTS "Users can insert comments on own tickets" ON ticket_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON ticket_comments;

CREATE POLICY "Users can view comments on own tickets"
  ON ticket_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM repair_tickets
      WHERE repair_tickets.id = ticket_comments.ticket_id
      AND repair_tickets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert comments on own tickets"
  ON ticket_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM repair_tickets
      WHERE repair_tickets.id = ticket_comments.ticket_id
      AND repair_tickets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own comments"
  ON ticket_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

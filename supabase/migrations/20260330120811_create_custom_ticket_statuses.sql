/*
  # Create custom ticket statuses table

  ## Overview
  Creates a table for user-defined ticket statuses with full CRUD support.
  Each shop owner can create, edit, reorder and delete their own statuses.

  ## Tables
  ### `custom_ticket_statuses`
  - `id` (uuid, primary key)
  - `user_id` (uuid) - shop owner
  - `name` (text) - display name
  - `color` (text) - dot/badge color hex
  - `category` (text) - on_hold | open | closed
  - `sort_order` (int)
  - `is_active` (boolean)
  - `created_at`

  ## Security
  - RLS enabled
  - Users can only manage their own statuses
*/

CREATE TABLE IF NOT EXISTS custom_ticket_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6b7280',
  category text NOT NULL DEFAULT 'open',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE custom_ticket_statuses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own statuses" ON custom_ticket_statuses;
DROP POLICY IF EXISTS "Users can insert own statuses" ON custom_ticket_statuses;
DROP POLICY IF EXISTS "Users can update own statuses" ON custom_ticket_statuses;
DROP POLICY IF EXISTS "Users can delete own statuses" ON custom_ticket_statuses;

CREATE POLICY "Users can view own statuses"
  ON custom_ticket_statuses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own statuses"
  ON custom_ticket_statuses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own statuses"
  ON custom_ticket_statuses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own statuses"
  ON custom_ticket_statuses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

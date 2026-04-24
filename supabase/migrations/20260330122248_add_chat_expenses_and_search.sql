/*
  # Add Chat, Expenses, and Search Features

  1. New Tables
    - `chat_messages` - Internal team chat messages
      - `id` (uuid, pk)
      - `user_id` (uuid, references auth.users)
      - `sender_name` (text)
      - `sender_color` (text)
      - `message` (text)
      - `ticket_ref` (text, optional ticket number reference)
      - `created_at` (timestamptz)
    
    - `expenses` - Shop expenses tracking
      - `id` (uuid, pk)
      - `user_id` (uuid)
      - `title` (text)
      - `amount` (numeric)
      - `category` (text)
      - `date` (date)
      - `notes` (text)
      - `receipt_url` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all new tables
    - Authenticated users can read/write chat messages
    - Users can only manage their own expenses
*/

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name text NOT NULL DEFAULT '',
  sender_color text NOT NULL DEFAULT '#1e40af',
  message text NOT NULL,
  ticket_ref text DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Authenticated users can insert chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can delete own chat messages" ON chat_messages;

CREATE POLICY "Authenticated users can read chat messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert chat messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat messages"
  ON chat_messages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  amount numeric(10, 2) NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'general',
  date date NOT NULL DEFAULT CURRENT_DATE,
  notes text DEFAULT '',
  receipt_url text DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can insert own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can delete own expenses" ON expenses;

CREATE POLICY "Users can read own expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses"
  ON expenses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses"
  ON expenses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS expenses_user_date_idx ON expenses(user_id, date DESC);

/*
  # Add technicians, settings, and enhanced ticket status support

  ## Overview
  Adds technician accounts, role-based permissions, ticket status configuration, 
  and general shop settings tables to support the internal configuration panel.

  ## New Tables

  ### `technicians`
  - `id` (uuid, primary key)
  - `user_id` (uuid, FK to auth.users) - linked auth account
  - `shop_owner_id` (uuid) - the owner who created this technician
  - `name` (text) - display name
  - `email` (text) - technician email
  - `phone` (text) - phone number
  - `role` (text) - admin, technician, receptionist
  - `permissions` (jsonb) - granular permission flags
  - `is_active` (boolean) - whether account is active
  - `color` (text) - avatar color for display
  - `created_at`, `updated_at`

  ### `ticket_statuses`
  - `id` (uuid, primary key)
  - `user_id` (uuid) - shop owner
  - `name` (text) - display name
  - `value` (text) - internal key
  - `color` (text) - hex color
  - `dot_color` (text) - status dot color
  - `category` (text) - on_hold, open, closed
  - `sort_order` (int)
  - `is_active` (boolean)

  ### `shop_settings`
  - `id` (uuid, primary key)
  - `user_id` (uuid) - shop owner
  - `shop_name` (text)
  - `address` (text)
  - `phone` (text)
  - `email` (text)
  - `website` (text)
  - `currency` (text)
  - `tax_rate` (numeric)
  - `footer_text` (text)
  - `logo_url` (text)
  - `invoice_prefix` (text)
  - `ticket_prefix` (text)
  - `created_at`, `updated_at`

  ## Security
  - RLS enabled on all tables
  - Users can only access their own shop data
*/

CREATE TABLE IF NOT EXISTS technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  role text NOT NULL DEFAULT 'technician',
  permissions jsonb DEFAULT '{"can_create_tickets": true, "can_edit_tickets": true, "can_delete_tickets": false, "can_view_reports": false, "can_manage_inventory": true, "can_manage_customers": true, "can_manage_settings": false}',
  is_active boolean DEFAULT true,
  color text DEFAULT '#1a3a2e',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view their technicians" ON technicians;
DROP POLICY IF EXISTS "Owners can insert technicians" ON technicians;
DROP POLICY IF EXISTS "Owners can update their technicians" ON technicians;
DROP POLICY IF EXISTS "Owners can delete their technicians" ON technicians;

CREATE POLICY "Owners can view their technicians"
  ON technicians FOR SELECT
  TO authenticated
  USING (auth.uid() = shop_owner_id);

CREATE POLICY "Owners can insert technicians"
  ON technicians FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = shop_owner_id);

CREATE POLICY "Owners can update their technicians"
  ON technicians FOR UPDATE
  TO authenticated
  USING (auth.uid() = shop_owner_id)
  WITH CHECK (auth.uid() = shop_owner_id);

CREATE POLICY "Owners can delete their technicians"
  ON technicians FOR DELETE
  TO authenticated
  USING (auth.uid() = shop_owner_id);


CREATE TABLE IF NOT EXISTS ticket_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  value text NOT NULL,
  color text NOT NULL DEFAULT '#6b7280',
  dot_color text NOT NULL DEFAULT '#6b7280',
  category text NOT NULL DEFAULT 'open',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ticket_statuses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own statuses" ON ticket_statuses;
DROP POLICY IF EXISTS "Users can insert own statuses" ON ticket_statuses;
DROP POLICY IF EXISTS "Users can update own statuses" ON ticket_statuses;
DROP POLICY IF EXISTS "Users can delete own statuses" ON ticket_statuses;

CREATE POLICY "Users can view own statuses"
  ON ticket_statuses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own statuses"
  ON ticket_statuses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own statuses"
  ON ticket_statuses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own statuses"
  ON ticket_statuses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


CREATE TABLE IF NOT EXISTS shop_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_name text DEFAULT 'Mi Taller',
  address text,
  phone text,
  email text,
  website text,
  currency text DEFAULT 'EUR',
  currency_symbol text DEFAULT '€',
  tax_rate numeric(5,2) DEFAULT 21.00,
  footer_text text DEFAULT '© 2026 - Mi Taller de Reparaciones',
  logo_url text,
  invoice_prefix text DEFAULT 'F-',
  ticket_prefix text DEFAULT '0-',
  default_warranty text DEFAULT 'Sin garantía',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE shop_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own settings" ON shop_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON shop_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON shop_settings;

CREATE POLICY "Users can view own settings"
  ON shop_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON shop_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON shop_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

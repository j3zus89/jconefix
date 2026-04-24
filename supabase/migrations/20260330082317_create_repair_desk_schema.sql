/*
  # RepairDesk SaaS Database Schema

  ## Overview
  Complete database schema for a repair shop management system supporting authentication,
  customer management, repair tickets, and inventory tracking.

  ## New Tables

  ### `profiles`
  Extended user profile information linked to auth.users
  - `id` (uuid, references auth.users)
  - `full_name` (text)
  - `shop_name` (text) - Name of the repair shop
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `customers`
  Customer database for the repair shop
  - `id` (uuid, primary key)
  - `user_id` (uuid) - Owner of this customer record
  - `name` (text, required)
  - `email` (text)
  - `phone` (text)
  - `address` (text)
  - `notes` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `repair_tickets`
  Repair job tracking
  - `id` (uuid, primary key)
  - `user_id` (uuid) - Shop owner
  - `customer_id` (uuid, references customers)
  - `ticket_number` (text, unique)
  - `device_type` (text) - e.g., "iPhone 13", "MacBook Pro"
  - `device_model` (text)
  - `serial_number` (text)
  - `issue_description` (text, required)
  - `status` (text) - pending, in_progress, completed, cancelled
  - `priority` (text) - low, medium, high, urgent
  - `estimated_cost` (decimal)
  - `final_cost` (decimal)
  - `notes` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  - `completed_at` (timestamptz)

  ### `inventory_items`
  Parts and supplies inventory
  - `id` (uuid, primary key)
  - `user_id` (uuid) - Shop owner
  - `name` (text, required)
  - `sku` (text)
  - `category` (text) - screens, batteries, tools, etc.
  - `quantity` (integer, default 0)
  - `min_quantity` (integer) - Alert threshold
  - `cost_price` (decimal)
  - `selling_price` (decimal)
  - `supplier` (text)
  - `notes` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Users can only access their own data
  - Policies ensure data isolation between different shop owners
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name text,
  shop_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  address text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own customers" ON customers;
DROP POLICY IF EXISTS "Users can insert own customers" ON customers;
DROP POLICY IF EXISTS "Users can update own customers" ON customers;
DROP POLICY IF EXISTS "Users can delete own customers" ON customers;

CREATE POLICY "Users can view own customers"
  ON customers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own customers"
  ON customers FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create repair_tickets table
CREATE TABLE IF NOT EXISTS repair_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers ON DELETE CASCADE,
  ticket_number text UNIQUE NOT NULL,
  device_type text NOT NULL,
  device_model text,
  serial_number text,
  issue_description text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  estimated_cost decimal(10,2),
  final_cost decimal(10,2),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE repair_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tickets" ON repair_tickets;
DROP POLICY IF EXISTS "Users can insert own tickets" ON repair_tickets;
DROP POLICY IF EXISTS "Users can update own tickets" ON repair_tickets;
DROP POLICY IF EXISTS "Users can delete own tickets" ON repair_tickets;

CREATE POLICY "Users can view own tickets"
  ON repair_tickets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tickets"
  ON repair_tickets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tickets"
  ON repair_tickets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tickets"
  ON repair_tickets FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create inventory_items table
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name text NOT NULL,
  sku text,
  category text,
  quantity integer DEFAULT 0,
  min_quantity integer DEFAULT 0,
  cost_price decimal(10,2),
  selling_price decimal(10,2),
  supplier text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own inventory" ON inventory_items;
DROP POLICY IF EXISTS "Users can insert own inventory" ON inventory_items;
DROP POLICY IF EXISTS "Users can update own inventory" ON inventory_items;
DROP POLICY IF EXISTS "Users can delete own inventory" ON inventory_items;

CREATE POLICY "Users can view own inventory"
  ON inventory_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own inventory"
  ON inventory_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own inventory"
  ON inventory_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own inventory"
  ON inventory_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_repair_tickets_updated_at ON repair_tickets;
CREATE TRIGGER update_repair_tickets_updated_at
  BEFORE UPDATE ON repair_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inventory_items_updated_at ON inventory_items;
CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_repair_tickets_user_id ON repair_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_repair_tickets_customer_id ON repair_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_repair_tickets_status ON repair_tickets(status);
CREATE INDEX IF NOT EXISTS idx_inventory_items_user_id ON inventory_items(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_number ON repair_tickets(ticket_number);

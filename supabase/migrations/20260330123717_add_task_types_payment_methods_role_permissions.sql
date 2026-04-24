/*
  # Add Task Types, Payment Methods, and Role Permissions tables

  1. New Tables
    - `task_types` - Configurable task/service types per shop
      - `id` (uuid, pk)
      - `user_id` (uuid, references auth.users)
      - `name` (text)
      - `sort_order` (int)
      - `is_active` (bool)
      - `created_at` (timestamptz)

    - `payment_methods` - Configurable payment methods per shop
      - `id` (uuid, pk)
      - `user_id` (uuid)
      - `name` (text)
      - `is_active` (bool)
      - `sort_order` (int)
      - `created_at` (timestamptz)

    - `role_permissions` - Per-shop customizable role permissions
      - `id` (uuid, pk)
      - `user_id` (uuid)
      - `role` (text) — 'admin'|'tech_1'|'tech_2'|'tech_3'|'receptionist'|'technician'
      - `permissions` (jsonb)
      - `updated_at` (timestamptz)

    - `repair_categories` - Device types / repair categories
      - `id` (uuid, pk)
      - `user_id` (uuid)
      - `name` (text)
      - `sort_order` (int)
      - `is_active` (bool)
      - `created_at` (timestamptz)

  2. Security
    - All tables have RLS enabled
    - Users can only access their own data

  3. Seed default data will be handled in application
*/

CREATE TABLE IF NOT EXISTS task_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE task_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own task types select" ON task_types;
DROP POLICY IF EXISTS "Users manage own task types insert" ON task_types;
DROP POLICY IF EXISTS "Users manage own task types update" ON task_types;
DROP POLICY IF EXISTS "Users manage own task types delete" ON task_types;
CREATE POLICY "Users manage own task types select" ON task_types FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users manage own task types insert" ON task_types FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own task types update" ON task_types FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own task types delete" ON task_types FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own payment methods select" ON payment_methods;
DROP POLICY IF EXISTS "Users manage own payment methods insert" ON payment_methods;
DROP POLICY IF EXISTS "Users manage own payment methods update" ON payment_methods;
DROP POLICY IF EXISTS "Users manage own payment methods delete" ON payment_methods;
CREATE POLICY "Users manage own payment methods select" ON payment_methods FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users manage own payment methods insert" ON payment_methods FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own payment methods update" ON payment_methods FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own payment methods delete" ON payment_methods FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own role permissions select" ON role_permissions;
DROP POLICY IF EXISTS "Users manage own role permissions insert" ON role_permissions;
DROP POLICY IF EXISTS "Users manage own role permissions update" ON role_permissions;
DROP POLICY IF EXISTS "Users manage own role permissions delete" ON role_permissions;
CREATE POLICY "Users manage own role permissions select" ON role_permissions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users manage own role permissions insert" ON role_permissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own role permissions update" ON role_permissions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own role permissions delete" ON role_permissions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS repair_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE repair_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own repair categories select" ON repair_categories;
DROP POLICY IF EXISTS "Users manage own repair categories insert" ON repair_categories;
DROP POLICY IF EXISTS "Users manage own repair categories update" ON repair_categories;
DROP POLICY IF EXISTS "Users manage own repair categories delete" ON repair_categories;
CREATE POLICY "Users manage own repair categories select" ON repair_categories FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users manage own repair categories insert" ON repair_categories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own repair categories update" ON repair_categories FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own repair categories delete" ON repair_categories FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS task_types_user_id_idx ON task_types(user_id);
CREATE INDEX IF NOT EXISTS payment_methods_user_id_idx ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS role_permissions_user_role_idx ON role_permissions(user_id, role);
CREATE INDEX IF NOT EXISTS repair_categories_user_id_idx ON repair_categories(user_id);

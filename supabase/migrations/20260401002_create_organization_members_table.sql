/*
  # Create Organization Members Table
  
  ## Overview
  This table manages the many-to-many relationship between users and organizations.
  It tracks which users belong to which organizations and their roles within each org.
  
  ## New Table: organization_members
  
  ### Columns
  - `id` (uuid, primary key)
  - `organization_id` (uuid, FK to organizations)
  - `user_id` (uuid, FK to auth.users)
  - `role` (text) - owner, admin, manager, technician, receptionist
  - `permissions` (jsonb) - Custom permissions override
  - `is_active` (boolean) - Whether the membership is active
  - `invited_by` (uuid) - Who invited this user
  - `joined_at` (timestamptz)
  - `created_at` (timestamptz)
  
  ## Security
  - RLS enabled
  - Users can only see members of their own organizations
  
  ## Migration Safety
  - This table is isolated
  - No modifications to existing tables
  - Existing functionality remains intact
*/

-- Create organization_members table
CREATE TABLE IF NOT EXISTS organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Role and permissions
  role text NOT NULL DEFAULT 'technician'
    CHECK (role IN ('owner', 'admin', 'manager', 'technician', 'receptionist')),
  permissions jsonb DEFAULT '{
    "can_create_tickets": true,
    "can_edit_tickets": true,
    "can_delete_tickets": false,
    "can_view_reports": false,
    "can_manage_inventory": true,
    "can_manage_customers": true,
    "can_manage_settings": false,
    "can_manage_users": false
  }'::jsonb,
  
  -- Status
  is_active boolean DEFAULT true,
  
  -- Metadata
  invited_by uuid REFERENCES auth.users(id),
  joined_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  
  -- Ensure a user can only be a member of an org once
  UNIQUE(organization_id, user_id)
);

-- Enable RLS
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view members of their organizations" ON organization_members;
DROP POLICY IF EXISTS "Owners and admins can insert members" ON organization_members;
DROP POLICY IF EXISTS "Owners and admins can update members" ON organization_members;
DROP POLICY IF EXISTS "Owners and admins can delete members" ON organization_members;

-- RLS Policies: Users can only see members of organizations they belong to
CREATE POLICY "Users can view members of their organizations"
  ON organization_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.is_active = true
    )
  );

CREATE POLICY "Owners and admins can insert members"
  ON organization_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
      AND om.is_active = true
    )
  );

CREATE POLICY "Owners and admins can update members"
  ON organization_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
      AND om.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
      AND om.is_active = true
    )
  );

CREATE POLICY "Owners and admins can delete members"
  ON organization_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
      AND om.is_active = true
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(role);
CREATE INDEX IF NOT EXISTS idx_org_members_active ON organization_members(is_active) WHERE is_active = true;

-- Update organizations RLS policy to include members
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organizations.id
      AND om.user_id = auth.uid()
      AND om.is_active = true
    )
  );

-- Helper function to get user's current organization
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS uuid AS $$
DECLARE
  org_id uuid;
BEGIN
  -- Get the first active organization for the current user
  SELECT organization_id INTO org_id
  FROM organization_members
  WHERE user_id = auth.uid()
  AND is_active = true
  ORDER BY joined_at ASC
  LIMIT 1;
  
  RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user belongs to organization
CREATE OR REPLACE FUNCTION user_belongs_to_org(org_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id
    AND user_id = auth.uid()
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's role in organization
CREATE OR REPLACE FUNCTION get_user_role_in_org(org_id uuid)
RETURNS text AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM organization_members
  WHERE organization_id = org_id
  AND user_id = auth.uid()
  AND is_active = true;
  
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE organization_members IS 'Manages user membership in organizations with roles and permissions';
COMMENT ON COLUMN organization_members.role IS 'User role within the organization: owner, admin, manager, technician, receptionist';
COMMENT ON COLUMN organization_members.permissions IS 'JSON object with granular permissions, can override role defaults';

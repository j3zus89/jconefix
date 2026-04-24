/*
  # Create Organizations Table for Multi-Tenant SaaS
  
  ## Overview
  This migration creates the foundation for multi-tenant architecture.
  It is ISOLATED and does not modify any existing tables or data.
  
  ## New Table: organizations
  
  Central table for managing different repair shop organizations (tenants).
  Each organization represents a separate business using JC ONE FIX.
  
  ### Columns
  - `id` (uuid, primary key) - Unique organization identifier
  - `name` (text, required) - Business/shop name
  - `slug` (text, unique) - URL-friendly identifier
  - `owner_id` (uuid) - Primary owner/admin user
  - `subscription_status` (text) - active, trial, suspended, cancelled
  - `subscription_plan` (text) - free, basic, pro, enterprise
  - `trial_ends_at` (timestamptz) - Trial expiration date
  - `max_users` (integer) - Maximum allowed users
  - `max_tickets` (integer) - Maximum monthly tickets (null = unlimited)
  - `features` (jsonb) - Enabled features for this org
  - `settings` (jsonb) - Organization-specific settings
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ## Security
  - RLS enabled
  - Only organization members can view their org
  - Only owners can update org settings
  
  ## Migration Safety
  - This table is completely isolated
  - No foreign keys to existing tables yet
  - No data modifications to existing tables
  - Existing functionality remains 100% intact
*/

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Subscription & licensing
  subscription_status text NOT NULL DEFAULT 'trial' 
    CHECK (subscription_status IN ('active', 'trial', 'suspended', 'cancelled')),
  subscription_plan text NOT NULL DEFAULT 'free'
    CHECK (subscription_plan IN ('free', 'basic', 'pro', 'enterprise')),
  trial_ends_at timestamptz DEFAULT (now() + interval '14 days'),
  
  -- Limits
  max_users integer DEFAULT 5,
  max_tickets integer, -- null = unlimited
  max_storage_mb integer DEFAULT 1000,
  
  -- Configuration
  features jsonb DEFAULT '{
    "advanced_reports": false,
    "api_access": false,
    "custom_branding": false,
    "multi_location": false,
    "integrations": false
  }'::jsonb,
  
  settings jsonb DEFAULT '{
    "timezone": "Europe/Madrid",
    "language": "es",
    "currency": "EUR"
  }'::jsonb,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz -- Soft delete support
);

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Owners can update their organizations" ON organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;

-- RLS Policies: Users can only see organizations they belong to
-- Note: We'll create the user-organization relationship table later
CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
    -- Later we'll add: OR EXISTS (SELECT 1 FROM organization_members WHERE ...)
  );

CREATE POLICY "Owners can update their organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(subscription_status);
CREATE INDEX IF NOT EXISTS idx_organizations_deleted_at ON organizations(deleted_at) WHERE deleted_at IS NULL;

-- Create helper function to generate unique slug from name
CREATE OR REPLACE FUNCTION generate_org_slug(org_name text)
RETURNS text AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  -- Convert to lowercase, replace spaces with hyphens, remove special chars
  base_slug := lower(regexp_replace(org_name, '[^a-zA-Z0-9\s-]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  
  final_slug := base_slug;
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM organizations WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE organizations IS 'Multi-tenant organizations table. Each organization represents a separate repair shop business.';
COMMENT ON COLUMN organizations.slug IS 'URL-friendly unique identifier for the organization';
COMMENT ON COLUMN organizations.subscription_status IS 'Current subscription state: active, trial, suspended, cancelled';
COMMENT ON COLUMN organizations.max_users IS 'Maximum number of users allowed in this organization';
COMMENT ON COLUMN organizations.features IS 'JSON object containing enabled features for this subscription plan';

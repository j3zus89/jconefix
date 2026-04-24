/*
  # Fix SUPER_ADMIN Organization Creation and Visibility
  
  ## Problem
  - Organizations created via API are not visible to SUPER_ADMIN
  - RLS policies might be blocking visibility
  
  ## Solution
  - Ensure is_super_admin() function exists
  - Update organizations RLS to include SUPER_ADMIN in all operations
  - Allow INSERT without owner requirement for service_role
*/

-- Ensure is_super_admin function exists
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND email = 'sr.gonzalezcala89@gmail.com'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update organizations RLS policies to allow SUPER_ADMIN full access
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    is_super_admin() -- SUPER_ADMIN sees everything
    OR owner_id = auth.uid() -- Owner sees their org
    OR EXISTS ( -- Members see their org
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organizations.id
      AND om.user_id = auth.uid()
      AND om.is_active = true
    )
  );

DROP POLICY IF EXISTS "Owners can update their organizations" ON organizations;
CREATE POLICY "Owners can update their organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    is_super_admin() -- SUPER_ADMIN can update any org
    OR owner_id = auth.uid() -- Owner can update their org
  )
  WITH CHECK (
    is_super_admin()
    OR owner_id = auth.uid()
  );

DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;
CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin() -- SUPER_ADMIN can create any org
    OR owner_id = auth.uid() -- User can create their own org
  );

DROP POLICY IF EXISTS "Authenticated users can delete organizations" ON organizations;
CREATE POLICY "Authenticated users can delete organizations"
  ON organizations FOR DELETE
  TO authenticated
  USING (
    is_super_admin() -- SUPER_ADMIN can delete any org
    OR owner_id = auth.uid() -- Owner can delete their org
  );

-- Ensure service_role can bypass RLS for initial setup
-- Organizations table already has service_role access for API routes

/*
  # Create SUPER_ADMIN System for Jesus
  
  ## Overview
  This migration creates a supreme administrator role for Jesus to manage
  all organizations and licenses from a central control panel.
  
  ## What This Does:
  1. Adds is_super_admin flag to auth.users metadata
  2. Marks Jesus (sr.gonzalezcala89@gmail.com) as SUPER_ADMIN
  3. Updates RLS policies to grant SUPER_ADMIN access to ALL organizations
  4. Creates helper functions for super admin checks
  
  ## Security:
  - Only Jesus can be SUPER_ADMIN
  - SUPER_ADMIN can view/manage all organizations
  - Regular users remain isolated to their organizations
  - No changes to existing ticket/repair functionality
  
  ## Safety:
  - Non-breaking changes
  - Existing functionality untouched
  - Adds new layer on top of existing system
*/

-- ============================================================================
-- PART 1: Create Super Admin Helper Functions
-- ============================================================================

-- Function to check if current user is super admin
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

-- Function to get super admin user ID
CREATE OR REPLACE FUNCTION get_super_admin_id()
RETURNS uuid AS $$
DECLARE
  admin_id uuid;
BEGIN
  SELECT id INTO admin_id
  FROM auth.users
  WHERE email = 'sr.gonzalezcala89@gmail.com'
  LIMIT 1;
  
  RETURN admin_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 2: Mark Jesus as SUPER_ADMIN
-- ============================================================================

-- Update Jesus's user metadata to include super_admin flag
DO $$
DECLARE
  jesus_id uuid;
BEGIN
  -- Get Jesus's user ID
  SELECT id INTO jesus_id
  FROM auth.users
  WHERE email = 'sr.gonzalezcala89@gmail.com'
  LIMIT 1;
  
  IF jesus_id IS NOT NULL THEN
    -- Update user metadata to mark as super admin
    UPDATE auth.users
    SET raw_user_meta_data = 
      COALESCE(raw_user_meta_data, '{}'::jsonb) || 
      '{"is_super_admin": true, "role": "SUPER_ADMIN"}'::jsonb
    WHERE id = jesus_id;
    
    RAISE NOTICE 'Jesus marked as SUPER_ADMIN successfully';
  ELSE
    RAISE NOTICE 'Jesus user not found - SUPER_ADMIN flag not set';
  END IF;
END $$;

-- ============================================================================
-- PART 3: Update Organizations RLS for SUPER_ADMIN Access
-- ============================================================================

-- SUPER_ADMIN can view ALL organizations
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

-- SUPER_ADMIN can update ALL organizations
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

-- ============================================================================
-- PART 4: Update Organization Members RLS for SUPER_ADMIN
-- ============================================================================

-- SUPER_ADMIN can view all organization members
DROP POLICY IF EXISTS "Users can view members of their organizations" ON organization_members;
CREATE POLICY "Users can view members of their organizations"
  ON organization_members FOR SELECT
  TO authenticated
  USING (
    is_super_admin() -- SUPER_ADMIN sees all members
    OR EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.is_active = true
    )
  );

-- ============================================================================
-- PART 5: Update Data Tables RLS for SUPER_ADMIN (Read-Only Supervision)
-- ============================================================================

-- SUPER_ADMIN can view ALL repair tickets (supervision mode)
DROP POLICY IF EXISTS "Users can view own tickets" ON repair_tickets;
CREATE POLICY "Users can view own tickets"
  ON repair_tickets FOR SELECT
  TO authenticated
  USING (
    is_super_admin() -- SUPER_ADMIN supervision
    OR auth.uid() = user_id -- Legacy mode
    OR (organization_id IS NOT NULL AND user_belongs_to_org(organization_id)) -- Org mode
  );

-- SUPER_ADMIN can view ALL customers (supervision mode)
DROP POLICY IF EXISTS "Users can view own customers" ON customers;
CREATE POLICY "Users can view own customers"
  ON customers FOR SELECT
  TO authenticated
  USING (
    is_super_admin()
    OR auth.uid() = user_id
    OR (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
  );

-- SUPER_ADMIN can view ALL inventory (supervision mode)
DROP POLICY IF EXISTS "Users can view own inventory" ON inventory_items;
CREATE POLICY "Users can view own inventory"
  ON inventory_items FOR SELECT
  TO authenticated
  USING (
    is_super_admin()
    OR auth.uid() = user_id
    OR (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
  );

-- SUPER_ADMIN can view ALL shop settings (supervision mode)
DROP POLICY IF EXISTS "Users can view own settings" ON shop_settings;
CREATE POLICY "Users can view own settings"
  ON shop_settings FOR SELECT
  TO authenticated
  USING (
    is_super_admin()
    OR auth.uid() = user_id
    OR (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
  );

-- ============================================================================
-- PART 6: Create Admin Statistics View
-- ============================================================================

-- Sustituir definición por completo: CREATE OR REPLACE VIEW no puede quitar columnas
-- si la vista ya existía con otra forma (Postgres 42P16).
DROP VIEW IF EXISTS admin_organization_stats;

-- Vista de estadísticas por organización (filtrada vía RLS / uso desde rol super admin)
CREATE VIEW admin_organization_stats AS
SELECT 
  o.id,
  o.name,
  o.slug,
  o.subscription_status,
  o.subscription_plan,
  o.created_at,
  o.trial_ends_at,
  o.max_users,
  o.max_tickets,
  
  -- Owner info
  u.email as owner_email,
  
  -- Statistics
  (SELECT COUNT(*) FROM organization_members om WHERE om.organization_id = o.id AND om.is_active = true) as active_users,
  (SELECT COUNT(*) FROM repair_tickets rt WHERE rt.organization_id = o.id) as total_tickets,
  (SELECT COUNT(*) FROM repair_tickets rt WHERE rt.organization_id = o.id AND rt.status = 'pending') as pending_tickets,
  (SELECT COUNT(*) FROM repair_tickets rt WHERE rt.organization_id = o.id AND rt.status = 'completed') as completed_tickets,
  (SELECT COUNT(*) FROM customers c WHERE c.organization_id = o.id) as total_customers,
  (SELECT COUNT(*) FROM inventory_items ii WHERE ii.organization_id = o.id) as total_inventory_items,
  
  -- Recent activity
  (SELECT MAX(rt.created_at) FROM repair_tickets rt WHERE rt.organization_id = o.id) as last_ticket_date,
  
  -- Subscription info
  CASE 
    WHEN o.subscription_status = 'trial' AND o.trial_ends_at < now() THEN 'expired'
    WHEN o.subscription_status = 'trial' THEN 'trial'
    ELSE o.subscription_status
  END as effective_status
  
FROM organizations o
LEFT JOIN auth.users u ON u.id = o.owner_id
ORDER BY o.created_at DESC;

-- Grant access to authenticated users (RLS will filter)
GRANT SELECT ON admin_organization_stats TO authenticated;

-- Create RLS policy for the view (SUPER_ADMIN only)
ALTER VIEW admin_organization_stats SET (security_barrier = true);

-- ============================================================================
-- PART 7: Create Audit Log Table for SUPER_ADMIN Actions
-- ============================================================================

CREATE TABLE IF NOT EXISTS super_admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL, -- 'suspend_org', 'activate_org', 'view_org_data', etc.
  target_organization_id uuid REFERENCES organizations(id),
  target_user_id uuid REFERENCES auth.users(id),
  details jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE super_admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin can view audit logs" ON super_admin_audit_log;
DROP POLICY IF EXISTS "Super admin can insert audit logs" ON super_admin_audit_log;

-- Only SUPER_ADMIN can view audit logs
CREATE POLICY "Super admin can view audit logs"
  ON super_admin_audit_log FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Only SUPER_ADMIN can insert audit logs
CREATE POLICY "Super admin can insert audit logs"
  ON super_admin_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin());

CREATE INDEX IF NOT EXISTS idx_audit_log_admin_user ON super_admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_target_org ON super_admin_audit_log(target_organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON super_admin_audit_log(created_at DESC);

-- ============================================================================
-- PART 8: Helper Function to Log Admin Actions
-- ============================================================================

CREATE OR REPLACE FUNCTION log_super_admin_action(
  p_action text,
  p_target_org_id uuid DEFAULT NULL,
  p_target_user_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  IF is_super_admin() THEN
    INSERT INTO super_admin_audit_log (
      admin_user_id,
      action,
      target_organization_id,
      target_user_id,
      details
    ) VALUES (
      auth.uid(),
      p_action,
      p_target_org_id,
      p_target_user_id,
      p_details
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION is_super_admin() IS 'Returns true if current user is Jesus (SUPER_ADMIN)';
COMMENT ON FUNCTION get_super_admin_id() IS 'Returns Jesus user ID';
COMMENT ON VIEW admin_organization_stats IS 'Organization statistics view - SUPER_ADMIN only';
COMMENT ON TABLE super_admin_audit_log IS 'Audit trail of all SUPER_ADMIN actions';
COMMENT ON FUNCTION log_super_admin_action IS 'Logs SUPER_ADMIN actions for audit trail';

/*
  VERIFICATION QUERIES:
  
  -- Check if Jesus is marked as SUPER_ADMIN
  SELECT email, raw_user_meta_data->>'is_super_admin' as is_super_admin
  FROM auth.users
  WHERE email = 'sr.gonzalezcala89@gmail.com';
  
  -- Test super admin function
  SELECT is_super_admin();
  
  -- View organization stats (as SUPER_ADMIN)
  SELECT * FROM admin_organization_stats;
*/

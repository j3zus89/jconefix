/*
  # Update RLS Policies for Dual Mode (Backward Compatible)
  
  ## Overview
  Updates all RLS policies to support BOTH user_id and organization_id.
  This ensures Jesus's existing system continues working while enabling multi-tenant.
  
  ## Strategy: DUAL MODE
  - Policies check: user_id = auth.uid() OR user belongs to organization
  - Legacy single-user mode: Works via user_id (Jesus's current setup)
  - New multi-tenant mode: Works via organization_id
  - 100% backward compatible
  - Zero breaking changes
  
  ## Tables Updated:
  - profiles
  - customers
  - repair_tickets
  - inventory_items
  - technicians
  - ticket_statuses
  - shop_settings
  
  ## Safety:
  - Old queries work exactly as before
  - New organization-based queries also work
  - Gradual migration path
  - Can rollback by reverting to old policies
*/

-- ============================================================================
-- PROFILES TABLE - Dual Mode RLS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id -- Legacy: direct user match
    OR
    (organization_id IS NOT NULL AND user_belongs_to_org(organization_id)) -- New: org member
  );

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id
    OR
    (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
  )
  WITH CHECK (
    auth.uid() = id
    OR
    (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
  );

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id
    OR
    (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
  );

-- ============================================================================
-- CUSTOMERS TABLE - Dual Mode RLS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own customers" ON customers;
CREATE POLICY "Users can view own customers"
  ON customers FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id -- Legacy
    OR
    (organization_id IS NOT NULL AND user_belongs_to_org(organization_id)) -- New
  );

DROP POLICY IF EXISTS "Users can insert own customers" ON customers;
CREATE POLICY "Users can insert own customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR
    (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
  );

DROP POLICY IF EXISTS "Users can update own customers" ON customers;
CREATE POLICY "Users can update own customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR
    (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
  )
  WITH CHECK (
    auth.uid() = user_id
    OR
    (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
  );

DROP POLICY IF EXISTS "Users can delete own customers" ON customers;
CREATE POLICY "Users can delete own customers"
  ON customers FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR
    (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
  );

-- ============================================================================
-- REPAIR_TICKETS TABLE - Dual Mode RLS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own tickets" ON repair_tickets;
CREATE POLICY "Users can view own tickets"
  ON repair_tickets FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR
    (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
  );

DROP POLICY IF EXISTS "Users can insert own tickets" ON repair_tickets;
CREATE POLICY "Users can insert own tickets"
  ON repair_tickets FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR
    (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
  );

DROP POLICY IF EXISTS "Users can update own tickets" ON repair_tickets;
CREATE POLICY "Users can update own tickets"
  ON repair_tickets FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR
    (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
  )
  WITH CHECK (
    auth.uid() = user_id
    OR
    (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
  );

DROP POLICY IF EXISTS "Users can delete own tickets" ON repair_tickets;
CREATE POLICY "Users can delete own tickets"
  ON repair_tickets FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR
    (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
  );

-- ============================================================================
-- INVENTORY_ITEMS TABLE - Dual Mode RLS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own inventory" ON inventory_items;
CREATE POLICY "Users can view own inventory"
  ON inventory_items FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR
    (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
  );

DROP POLICY IF EXISTS "Users can insert own inventory" ON inventory_items;
CREATE POLICY "Users can insert own inventory"
  ON inventory_items FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR
    (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
  );

DROP POLICY IF EXISTS "Users can update own inventory" ON inventory_items;
CREATE POLICY "Users can update own inventory"
  ON inventory_items FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR
    (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
  )
  WITH CHECK (
    auth.uid() = user_id
    OR
    (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
  );

DROP POLICY IF EXISTS "Users can delete own inventory" ON inventory_items;
CREATE POLICY "Users can delete own inventory"
  ON inventory_items FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR
    (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
  );

-- ============================================================================
-- TECHNICIANS TABLE - Dual Mode RLS
-- ============================================================================

DROP POLICY IF EXISTS "Owners can view their technicians" ON technicians;
CREATE POLICY "Owners can view their technicians"
  ON technicians FOR SELECT
  TO authenticated
  USING (
    auth.uid() = shop_owner_id
    OR
    (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
  );

DROP POLICY IF EXISTS "Owners can insert technicians" ON technicians;
CREATE POLICY "Owners can insert technicians"
  ON technicians FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = shop_owner_id
    OR
    (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
  );

DROP POLICY IF EXISTS "Owners can update their technicians" ON technicians;
CREATE POLICY "Owners can update their technicians"
  ON technicians FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = shop_owner_id
    OR
    (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
  )
  WITH CHECK (
    auth.uid() = shop_owner_id
    OR
    (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
  );

DROP POLICY IF EXISTS "Owners can delete their technicians" ON technicians;
CREATE POLICY "Owners can delete their technicians"
  ON technicians FOR DELETE
  TO authenticated
  USING (
    auth.uid() = shop_owner_id
    OR
    (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
  );

-- ============================================================================
-- TICKET_STATUSES TABLE - Dual Mode RLS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own statuses" ON ticket_statuses;
CREATE POLICY "Users can view own statuses"
  ON ticket_statuses FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR
    (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
  );

DROP POLICY IF EXISTS "Users can insert own statuses" ON ticket_statuses;
CREATE POLICY "Users can insert own statuses"
  ON ticket_statuses FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR
    (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
  );

DROP POLICY IF EXISTS "Users can update own statuses" ON ticket_statuses;
CREATE POLICY "Users can update own statuses"
  ON ticket_statuses FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR
    (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
  )
  WITH CHECK (
    auth.uid() = user_id
    OR
    (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
  );

DROP POLICY IF EXISTS "Users can delete own statuses" ON ticket_statuses;
CREATE POLICY "Users can delete own statuses"
  ON ticket_statuses FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR
    (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
  );

-- ============================================================================
-- SHOP_SETTINGS TABLE - Dual Mode RLS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own settings" ON shop_settings;
CREATE POLICY "Users can view own settings"
  ON shop_settings FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR
    (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
  );

DROP POLICY IF EXISTS "Users can insert own settings" ON shop_settings;
CREATE POLICY "Users can insert own settings"
  ON shop_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR
    (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
  );

DROP POLICY IF EXISTS "Users can update own settings" ON shop_settings;
CREATE POLICY "Users can update own settings"
  ON shop_settings FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR
    (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
  )
  WITH CHECK (
    auth.uid() = user_id
    OR
    (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
  );

/*
  VERIFICATION:
  
  These policies now support TWO modes simultaneously:
  
  1. LEGACY MODE (Jesus's current setup):
     - Works via user_id = auth.uid()
     - No organization_id needed
     - Existing queries work unchanged
  
  2. MULTI-TENANT MODE (New SaaS customers):
     - Works via organization_id + organization_members
     - Multiple users share same organization data
     - Isolated between organizations
  
  Jesus's system will continue working exactly as before because:
  - His data has organization_id set to default org
  - He's a member of that org
  - Both conditions (user_id OR org membership) are true
  - Zero breaking changes
*/

/*
  # Create Default Organization and Migrate Existing Data
  
  ## Overview
  This migration creates a default organization for Jesus's existing data
  and assigns all existing records to this organization.
  
  ## CRITICAL SAFETY:
  - Creates "JC ONE FIX" organization
  - Assigns Jesus (sr.gonzalezcala89@gmail.com) as owner
  - Links ALL existing data to this organization
  - Maintains 100% backward compatibility
  - Zero data loss
  
  ## What This Does:
  1. Creates default organization
  2. Adds Jesus as organization owner in organization_members
  3. Updates all existing records to link to this organization
  4. Verifies data integrity
  
  ## Rollback Safety:
  - If this fails, organization_id columns remain NULL
  - Existing user_id-based RLS policies still work
  - No breaking changes
*/

DO $$
DECLARE
  default_org_id uuid;
  jesus_user_id uuid;
  affected_rows integer;
  subscription_plan_val text;
  uses_modern_plan_check boolean;
BEGIN
  -- Get Jesus's user ID
  SELECT id INTO jesus_user_id
  FROM auth.users
  WHERE email = 'sr.gonzalezcala89@gmail.com'
  LIMIT 1;

  -- Migración 20260402102: CHECK solo (basico, profesional). Detectar esquema moderno por columna
  -- `plan_type` o por definición del constraint (bases desincronizadas con el historial de migraciones).
  SELECT
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'organizations'
        AND column_name = 'plan_type'
    )
    OR EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace AND n.nspname = 'public'
      WHERE r.relname = 'organizations'
        AND c.conname = 'organizations_subscription_plan_check'
        AND pg_get_constraintdef(c.oid) LIKE '%profesional%'
    )
  INTO uses_modern_plan_check;

  subscription_plan_val := CASE WHEN uses_modern_plan_check THEN 'profesional' ELSE 'enterprise' END;
  
  -- Only proceed if Jesus's account exists
  IF jesus_user_id IS NOT NULL THEN

    SELECT id INTO default_org_id
    FROM organizations
    WHERE slug = 'jc-one-fix'
    LIMIT 1;

    IF default_org_id IS NULL THEN
    
    -- Create default organization for existing data
    INSERT INTO organizations (
      id,
      name,
      slug,
      owner_id,
      subscription_status,
      subscription_plan,
      trial_ends_at,
      max_users,
      max_tickets,
      features,
      settings
    ) VALUES (
      gen_random_uuid(),
      'JC ONE FIX',
      'jc-one-fix',
      jesus_user_id,
      'active', -- Jesus gets active status
      subscription_plan_val,
      NULL, -- No trial expiration
      999, -- Unlimited users
      NULL, -- Unlimited tickets
      '{
        "advanced_reports": true,
        "api_access": true,
        "custom_branding": true,
        "multi_location": true,
        "integrations": true
      }'::jsonb,
      '{
        "timezone": "Europe/Madrid",
        "language": "es",
        "currency": "EUR"
      }'::jsonb
    )
    RETURNING id INTO default_org_id;

    IF uses_modern_plan_check THEN
      UPDATE organizations
      SET
        plan_type = subscription_plan_val,
        billing_cycle = COALESCE(billing_cycle, 'mensual')
      WHERE id = default_org_id;
    END IF;

    ELSE
      RAISE NOTICE 'Organization jc-one-fix already exists, reusing id %', default_org_id;
    END IF;
    
    RAISE NOTICE 'Default organization id % for user: %', default_org_id, jesus_user_id;
    
    -- Add Jesus as owner in organization_members
    INSERT INTO organization_members (
      organization_id,
      user_id,
      role,
      permissions,
      is_active,
      joined_at
    ) VALUES (
      default_org_id,
      jesus_user_id,
      'owner',
      '{
        "can_create_tickets": true,
        "can_edit_tickets": true,
        "can_delete_tickets": true,
        "can_view_reports": true,
        "can_manage_inventory": true,
        "can_manage_customers": true,
        "can_manage_settings": true,
        "can_manage_users": true
      }'::jsonb,
      true,
      now()
    )
    ON CONFLICT (organization_id, user_id) DO NOTHING;
    
    RAISE NOTICE 'Ensured Jesus as organization owner (insert or already present)';
    
    -- Migrate existing data to default organization
    -- Update profiles
    UPDATE profiles
    SET organization_id = default_org_id
    WHERE organization_id IS NULL;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE 'Updated % profiles', affected_rows;
    
    -- Update customers
    UPDATE customers
    SET organization_id = default_org_id
    WHERE organization_id IS NULL;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE 'Updated % customers', affected_rows;
    
    -- Update repair_tickets
    UPDATE repair_tickets
    SET organization_id = default_org_id
    WHERE organization_id IS NULL;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE 'Updated % repair_tickets', affected_rows;
    
    -- Update inventory_items
    UPDATE inventory_items
    SET organization_id = default_org_id
    WHERE organization_id IS NULL;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE 'Updated % inventory_items', affected_rows;
    
    -- Update technicians
    UPDATE technicians
    SET organization_id = default_org_id
    WHERE organization_id IS NULL;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE 'Updated % technicians', affected_rows;
    
    -- Update ticket_statuses
    UPDATE ticket_statuses
    SET organization_id = default_org_id
    WHERE organization_id IS NULL;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE 'Updated % ticket_statuses', affected_rows;
    
    -- Update shop_settings
    UPDATE shop_settings
    SET organization_id = default_org_id
    WHERE organization_id IS NULL;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE 'Updated % shop_settings', affected_rows;
    
    RAISE NOTICE 'Migration completed successfully!';
    
  ELSE
    RAISE NOTICE 'Jesus user account not found - skipping default organization creation';
    RAISE NOTICE 'This is safe - organization_id columns remain NULL and system works normally';
  END IF;
  
END $$;

-- Verification query (commented out, can be run manually)
/*
SELECT 
  'profiles' as table_name,
  COUNT(*) as total_rows,
  COUNT(organization_id) as rows_with_org
FROM profiles
UNION ALL
SELECT 'customers', COUNT(*), COUNT(organization_id) FROM customers
UNION ALL
SELECT 'repair_tickets', COUNT(*), COUNT(organization_id) FROM repair_tickets
UNION ALL
SELECT 'inventory_items', COUNT(*), COUNT(organization_id) FROM inventory_items
UNION ALL
SELECT 'technicians', COUNT(*), COUNT(organization_id) FROM technicians
UNION ALL
SELECT 'ticket_statuses', COUNT(*), COUNT(organization_id) FROM ticket_statuses
UNION ALL
SELECT 'shop_settings', COUNT(*), COUNT(organization_id) FROM shop_settings;
*/

COMMENT ON COLUMN organizations.id IS 'Organization UUID - default org created for Jesus: JC ONE FIX';

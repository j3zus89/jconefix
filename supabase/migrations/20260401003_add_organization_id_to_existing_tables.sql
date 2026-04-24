/*
  # Add organization_id to Existing Tables - SAFE MIGRATION
  
  ## Overview
  This migration adds organization_id column to all existing tables.
  
  ## CRITICAL SAFETY MEASURES:
  1. All columns are NULLABLE initially
  2. NO foreign key constraints yet (added later)
  3. Existing data remains untouched
  4. Default value will be set for Jesus's existing data in next migration
  5. RLS policies remain unchanged (backward compatible)
  
  ## Tables Modified:
  - profiles
  - customers
  - repair_tickets
  - inventory_items
  - technicians
  - ticket_statuses
  - shop_settings
  
  ## Migration Strategy:
  Step 1 (this file): Add nullable organization_id columns
  Step 2 (next file): Create default organization and assign to existing data
  Step 3 (later): Add foreign key constraints
  Step 4 (later): Update RLS policies to use organization_id
  
  ## Safety Guarantee:
  - Existing queries continue to work
  - No data loss
  - No breaking changes
  - Jesus's system remains fully functional
*/

-- Add organization_id to profiles (nullable, no constraints yet)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS organization_id uuid;

-- Add organization_id to customers
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS organization_id uuid;

-- Add organization_id to repair_tickets
ALTER TABLE repair_tickets 
ADD COLUMN IF NOT EXISTS organization_id uuid;

-- Add organization_id to inventory_items
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS organization_id uuid;

-- Add organization_id to technicians
ALTER TABLE technicians 
ADD COLUMN IF NOT EXISTS organization_id uuid;

-- Add organization_id to ticket_statuses
ALTER TABLE ticket_statuses 
ADD COLUMN IF NOT EXISTS organization_id uuid;

-- Add organization_id to shop_settings
ALTER TABLE shop_settings 
ADD COLUMN IF NOT EXISTS organization_id uuid;

-- Índices (sin CONCURRENTLY: las migraciones van dentro de una transacción y Postgres no permite CONCURRENTLY ahí)
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id
  ON profiles(organization_id) WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_organization_id
  ON customers(organization_id) WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_repair_tickets_organization_id
  ON repair_tickets(organization_id) WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_items_organization_id
  ON inventory_items(organization_id) WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_technicians_organization_id
  ON technicians(organization_id) WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ticket_statuses_organization_id
  ON ticket_statuses(organization_id) WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shop_settings_organization_id
  ON shop_settings(organization_id) WHERE organization_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN profiles.organization_id IS 'Links profile to organization (nullable for backward compatibility)';
COMMENT ON COLUMN customers.organization_id IS 'Links customer to organization (nullable for backward compatibility)';
COMMENT ON COLUMN repair_tickets.organization_id IS 'Links ticket to organization (nullable for backward compatibility)';
COMMENT ON COLUMN inventory_items.organization_id IS 'Links inventory item to organization (nullable for backward compatibility)';
COMMENT ON COLUMN technicians.organization_id IS 'Links technician to organization (nullable for backward compatibility)';
COMMENT ON COLUMN ticket_statuses.organization_id IS 'Links status to organization (nullable for backward compatibility)';
COMMENT ON COLUMN shop_settings.organization_id IS 'Links settings to organization (nullable for backward compatibility)';

/*
  IMPORTANT NOTES:
  
  1. All organization_id columns are NULLABLE
  2. No foreign key constraints added yet
  3. Existing RLS policies still work with user_id
  4. No data modifications in this migration
  5. Indexes created as normal CREATE INDEX (compatible with migration transactions)
  
  Next Steps (in separate migrations):
  - Create default "JC ONE FIX - Jesus" organization
  - Assign all existing data to this default organization
  - Add foreign key constraints
  - Update RLS policies to check organization_id OR user_id (dual mode)
  - Eventually migrate fully to organization_id only
*/

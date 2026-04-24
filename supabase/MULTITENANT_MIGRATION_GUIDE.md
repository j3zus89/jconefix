# 🏢 JC ONE FIX - Multi-Tenant SaaS Migration Guide

## 📋 Overview

This guide explains the safe migration of JC ONE FIX from a single-user system to a multi-tenant SaaS platform.

**CRITICAL**: All migrations are designed to be **100% backward compatible**. Jesus's existing system will continue working without any interruption.

---

## 🎯 Migration Goals

1. ✅ Enable multiple organizations (repair shops) to use the same system
2. ✅ Complete data isolation between organizations
3. ✅ Maintain Jesus's existing functionality without breaking changes
4. ✅ Support subscription/licensing model
5. ✅ Enable organization-based user management

---

## 🗂️ New Database Structure

### New Tables Created

#### 1. `organizations`
Central table for managing different repair shop businesses (tenants).

**Key Columns:**
- `id` - Unique organization identifier
- `name` - Business name
- `slug` - URL-friendly identifier
- `owner_id` - Primary admin user
- `subscription_status` - active, trial, suspended, cancelled
- `subscription_plan` - free, basic, pro, enterprise
- `max_users` - User limit per plan
- `features` - JSON with enabled features

#### 2. `organization_members`
Manages user membership in organizations with roles.

**Key Columns:**
- `organization_id` - Which organization
- `user_id` - Which user
- `role` - owner, admin, manager, technician, receptionist
- `permissions` - Granular permission overrides
- `is_active` - Membership status

### Modified Tables

All existing tables now have an `organization_id` column:
- `profiles`
- `customers`
- `repair_tickets`
- `inventory_items`
- `technicians`
- `ticket_statuses`
- `shop_settings`

---

## 🔒 Security Architecture

### Row Level Security (RLS) - Dual Mode

All RLS policies now support **TWO modes simultaneously**:

#### Legacy Mode (Jesus's current setup)
```sql
auth.uid() = user_id
```
- Works exactly as before
- No organization_id needed
- Existing queries unchanged

#### Multi-Tenant Mode (New SaaS customers)
```sql
organization_id IS NOT NULL AND user_belongs_to_org(organization_id)
```
- Multiple users share organization data
- Complete isolation between organizations
- New customers get this mode

**Result**: Jesus's system works via BOTH conditions, ensuring zero breaking changes.

---

## 📦 Migration Files (In Order)

### 1. `20260401001_create_organizations_table.sql`
**What it does:**
- Creates `organizations` table
- Adds RLS policies
- Creates helper functions for slug generation

**Safety:**
- Completely isolated
- No impact on existing tables
- Can be applied immediately

### 2. `20260401002_create_organization_members_table.sql`
**What it does:**
- Creates `organization_members` table
- Links users to organizations with roles
- Creates helper functions (get_user_organization_id, user_belongs_to_org)

**Safety:**
- Isolated table
- No modifications to existing data
- Can be applied immediately

### 3. `20260401003_add_organization_id_to_existing_tables.sql`
**What it does:**
- Adds `organization_id` column to all existing tables
- Creates indexes for performance

**Safety:**
- All columns are NULLABLE
- No foreign key constraints yet
- No data modifications
- Existing queries work unchanged
- **SAFE TO APPLY**

### 4. `20260401004_create_default_organization_and_migrate_data.sql`
**What it does:**
- Creates "JC ONE FIX" organization for Jesus
- Assigns Jesus as owner
- Links ALL existing data to this organization
- Adds Jesus to organization_members

**Safety:**
- Only runs if Jesus's account exists (sr.gonzalezcala89@gmail.com)
- If it fails, organization_id stays NULL (system still works)
- Includes verification queries
- **SAFE TO APPLY**

### 5. `20260401005_update_rls_policies_dual_mode.sql`
**What it does:**
- Updates all RLS policies to support dual mode
- Checks BOTH user_id AND organization membership

**Safety:**
- Backward compatible
- Jesus's queries work via user_id OR organization_id
- New customers work via organization_id only
- **SAFE TO APPLY**

---

## 🚀 How to Apply Migrations

### Option 1: Supabase Dashboard (Recommended for Testing)

1. Go to Supabase Dashboard → SQL Editor
2. Copy content from each migration file **in order**
3. Run each migration one by one
4. Check for success messages
5. Verify data integrity after each step

### Option 2: Supabase CLI (Production)

```bash
# From project root
cd supabase

# Apply all migrations
supabase db push

# Or apply specific migration
supabase db push --include-all --include-seed
```

### Option 3: Manual Verification

After applying migrations, run this verification query:

```sql
-- Check organization creation
SELECT * FROM organizations WHERE slug = 'jc-one-fix';

-- Check Jesus's membership
SELECT om.*, o.name as org_name
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
JOIN auth.users u ON u.id = om.user_id
WHERE u.email = 'sr.gonzalezcala89@gmail.com';

-- Check data migration
SELECT 
  'profiles' as table_name,
  COUNT(*) as total_rows,
  COUNT(organization_id) as rows_with_org,
  COUNT(*) - COUNT(organization_id) as rows_without_org
FROM profiles
UNION ALL
SELECT 'customers', COUNT(*), COUNT(organization_id), COUNT(*) - COUNT(organization_id) FROM customers
UNION ALL
SELECT 'repair_tickets', COUNT(*), COUNT(organization_id), COUNT(*) - COUNT(organization_id) FROM repair_tickets
UNION ALL
SELECT 'inventory_items', COUNT(*), COUNT(organization_id), COUNT(*) - COUNT(organization_id) FROM inventory_items;
```

Expected result: All rows should have `organization_id` populated.

---

## ✅ Post-Migration Verification

### Test Jesus's System Still Works

1. **Login Test**
   ```
   Email: sr.gonzalezcala89@gmail.com
   Password: 120289
   ```
   ✅ Should login successfully

2. **View Tickets**
   - Navigate to Tickets page
   - ✅ Should see all existing tickets

3. **Create New Ticket**
   - Create a test ticket
   - ✅ Should save successfully
   - ✅ Should have organization_id set automatically

4. **View Customers**
   - Navigate to Customers page
   - ✅ Should see all existing customers

5. **Check Settings**
   - Navigate to Settings
   - ✅ Should see shop settings
   - ✅ Should be able to update

### Test Organization Features

```sql
-- Get Jesus's organization
SELECT * FROM organizations WHERE owner_id = (
  SELECT id FROM auth.users WHERE email = 'sr.gonzalezcala89@gmail.com'
);

-- Check organization members
SELECT 
  u.email,
  om.role,
  om.is_active,
  o.name as organization_name
FROM organization_members om
JOIN auth.users u ON u.id = om.user_id
JOIN organizations o ON o.id = om.organization_id;
```

---

## 🛡️ Rollback Plan

If anything goes wrong, you can rollback:

### Rollback Step 5 (RLS Policies)
```sql
-- Revert to original RLS policies
-- (Copy original policies from migration files 20260330082317 and 20260330114645)
```

### Rollback Step 4 (Data Migration)
```sql
-- Set organization_id back to NULL
UPDATE profiles SET organization_id = NULL;
UPDATE customers SET organization_id = NULL;
UPDATE repair_tickets SET organization_id = NULL;
UPDATE inventory_items SET organization_id = NULL;
UPDATE technicians SET organization_id = NULL;
UPDATE ticket_statuses SET organization_id = NULL;
UPDATE shop_settings SET organization_id = NULL;

-- Delete default organization
DELETE FROM organization_members WHERE organization_id IN (
  SELECT id FROM organizations WHERE slug = 'jc-one-fix'
);
DELETE FROM organizations WHERE slug = 'jc-one-fix';
```

### Rollback Step 3 (Add Columns)
```sql
-- Remove organization_id columns
ALTER TABLE profiles DROP COLUMN IF EXISTS organization_id;
ALTER TABLE customers DROP COLUMN IF EXISTS organization_id;
ALTER TABLE repair_tickets DROP COLUMN IF EXISTS organization_id;
ALTER TABLE inventory_items DROP COLUMN IF EXISTS organization_id;
ALTER TABLE technicians DROP COLUMN IF EXISTS organization_id;
ALTER TABLE ticket_statuses DROP COLUMN IF EXISTS organization_id;
ALTER TABLE shop_settings DROP COLUMN IF EXISTS organization_id;
```

### Rollback Steps 1-2 (New Tables)
```sql
-- Drop new tables
DROP TABLE IF EXISTS organization_members CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
```

---

## 🎓 Next Steps (After Migration)

Once migrations are applied and verified:

1. **Update Application Code**
   - Modify data insertion to include organization_id
   - Update queries to filter by organization
   - Add organization context to user session

2. **Create Onboarding Flow**
   - New organization registration page
   - Owner account creation
   - Initial setup wizard

3. **Add Subscription Management**
   - Stripe/payment integration
   - Plan upgrade/downgrade logic
   - Usage tracking

4. **Build Admin Panel**
   - View all organizations
   - Manage subscriptions
   - Monitor usage

---

## 📞 Support

If you encounter any issues during migration:

1. Check the verification queries above
2. Review Supabase logs for errors
3. Ensure Jesus's account exists before running migration 4
4. Contact development team with error details

---

## 🔐 Security Notes

- All organization data is isolated via RLS
- Users can only access their organization's data
- Owner/Admin roles required for sensitive operations
- Subscription status checked at application level
- API rate limiting per organization recommended

---

**Last Updated**: April 1, 2026
**Migration Version**: 1.0
**Status**: Ready for Testing

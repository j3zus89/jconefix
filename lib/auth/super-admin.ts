/**
 * Super Admin Authentication Utilities
 * 
 * Provides functions to check if a user is the SUPER_ADMIN (Jesus)
 * and protect routes that should only be accessible to SUPER_ADMIN.
 */

import { createClient } from '@/lib/supabase/client';
import { isUserRecordSuperAdmin } from '@/lib/auth/super-admin-allowlist';

/**
 * Check if the current user is the SUPER_ADMIN
 */
export async function isSuperAdmin(): Promise<boolean> {
  const supabase = createClient();
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return false;
    }

    return isUserRecordSuperAdmin(user);
  } catch (error) {
    console.error('Error checking super admin status:', error);
    return false;
  }
}

/**
 * Get the SUPER_ADMIN user if current user is super admin
 */
export async function getSuperAdminUser() {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user || !isUserRecordSuperAdmin(user)) {
    return null;
  }
  
  return user;
}

/**
 * Verify super admin access and throw error if not authorized
 */
export async function requireSuperAdmin() {
  const isAdmin = await isSuperAdmin();
  
  if (!isAdmin) {
    throw new Error('Unauthorized: SUPER_ADMIN access required');
  }
}

/**
 * Log super admin action to audit trail
 */
export async function logSuperAdminAction(
  action: string,
  targetOrgId?: string,
  targetUserId?: string,
  details?: Record<string, any>
) {
  const supabase = createClient();
  
  try {
    await supabase.rpc('log_super_admin_action', {
      p_action: action,
      p_target_org_id: targetOrgId || null,
      p_target_user_id: targetUserId || null,
      p_details: details || null,
    });
  } catch (error) {
    console.error('Error logging super admin action:', error);
  }
}

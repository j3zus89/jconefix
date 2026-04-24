import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSuperAdminFromRequest } from '@/lib/auth/super-admin-server';
import {
  adminPlanSelectValue,
  computeLicenseExpiresAt,
  licenseDefaultsForPlan,
  mergeOrgFeatures,
  normalizeBillingCycle,
  normalizePlanType,
} from '@/lib/org-plan';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdminFromRequest(request);
    if (!auth.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });
    }
    const superAdminUserId = auth.user?.id ?? null;

    const { orgId, action, updates } = await request.json();
    
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
    }

    // Crear cliente admin con service_role
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    if (action === 'update_status') {
      const { error } = await supabaseAdmin
        .from('organizations')
        .update({ subscription_status: updates.subscription_status })
        .eq('id', orgId);
      
      if (error) throw error;

      await supabaseAdmin.rpc('log_super_admin_action', {
        p_action: 'update_org_status',
        p_target_org_id: orgId,
        p_target_user_id: null,
        p_details: { subscription_status: updates.subscription_status },
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'update_trial') {
      const syncLicense = updates.sync_trial_license_expires !== false;
      const { data: row, error: fetchErr } = await supabaseAdmin
        .from('organizations')
        .select('trial_ends_at')
        .eq('id', orgId)
        .maybeSingle();
      if (fetchErr) throw fetchErr;

      let newTrialEnd: string | null = null;

      if (typeof updates.trial_ends_at === 'string' && updates.trial_ends_at.trim()) {
        const d = new Date(updates.trial_ends_at.trim());
        if (Number.isNaN(d.getTime())) {
          return NextResponse.json({ error: 'Fecha de fin de prueba inválida' }, { status: 400 });
        }
        newTrialEnd = d.toISOString();
      } else if (typeof updates.trial_extend_days === 'number' && updates.trial_extend_days !== 0) {
        if (!Number.isFinite(updates.trial_extend_days) || Math.abs(updates.trial_extend_days) > 730) {
          return NextResponse.json(
            { error: 'Los días deben estar entre -730 y 730 (sin contar el 0)' },
            { status: 400 }
          );
        }
        const now = Date.now();
        const currentEndMs = row?.trial_ends_at ? new Date(row.trial_ends_at).getTime() : now;
        // Para restar días usamos la fecha actual de fin sin limitarla a "ahora"
        const base = updates.trial_extend_days > 0 ? Math.max(now, currentEndMs) : currentEndMs;
        newTrialEnd = new Date(base + updates.trial_extend_days * 24 * 60 * 60 * 1000).toISOString();
      } else {
        return NextResponse.json(
          { error: 'Indica días a añadir a la prueba o una fecha/hora de fin' },
          { status: 400 }
        );
      }

      const patch: Record<string, string> = { trial_ends_at: newTrialEnd };
      if (syncLicense) {
        patch.license_expires_at = newTrialEnd;
      }

      const { error } = await supabaseAdmin.from('organizations').update(patch).eq('id', orgId);
      if (error) throw error;

      await supabaseAdmin.rpc('log_super_admin_action', {
        p_action: 'update_org_trial',
        p_target_org_id: orgId,
        p_target_user_id: null,
        p_details: { ...patch, trial_extend_days: updates.trial_extend_days },
      });
      return NextResponse.json({ success: true, trial_ends_at: newTrialEnd });
    }

    if (action === 'update_license') {
      const patch: any = {};
      if (typeof updates.subscription_status === 'string') patch.subscription_status = updates.subscription_status;
      if (updates.max_tickets === null || typeof updates.max_tickets === 'number') patch.max_tickets = updates.max_tickets;
      if (typeof updates.license_unlimited === 'boolean') patch.license_unlimited = updates.license_unlimited;

      if (updates.renew_license_from_today === true && updates.apply_plan_defaults !== true) {
        const { data: row } = await supabaseAdmin
          .from('organizations')
          .select('billing_cycle')
          .eq('id', orgId)
          .maybeSingle();
        patch.license_expires_at = computeLicenseExpiresAt(
          normalizeBillingCycle(updates.billing_cycle || row?.billing_cycle)
        );
      }

      if (updates.apply_plan_defaults === true) {
        const { data: row } = await supabaseAdmin
          .from('organizations')
          .select('features, billing_cycle, plan_type')
          .eq('id', orgId)
          .maybeSingle();
        const planKey =
          typeof updates.plan_type === 'string'
            ? updates.plan_type
            : typeof updates.subscription_plan === 'string'
              ? updates.subscription_plan
              : row?.plan_type;
        const sel = adminPlanSelectValue(planKey, row?.plan_type);
        const def = licenseDefaultsForPlan(sel);
        patch.plan_type = def.plan_type;
        patch.subscription_plan = def.subscription_plan;
        patch.max_users = def.max_users;
        patch.max_tickets = sel === 'profesional' ? null : 500;
        patch.features = mergeOrgFeatures(row?.features, def.features);
        if (typeof updates.billing_cycle === 'string') {
          patch.billing_cycle = normalizeBillingCycle(updates.billing_cycle);
        }
        if (updates.renew_license_from_today === true) {
          const cycle = normalizeBillingCycle(updates.billing_cycle || row?.billing_cycle);
          patch.license_expires_at = computeLicenseExpiresAt(cycle);
        }
      } else {
        if (typeof updates.plan_type === 'string') patch.plan_type = normalizePlanType(updates.plan_type);
        if (typeof updates.subscription_plan === 'string') patch.subscription_plan = updates.subscription_plan;
        if (typeof updates.billing_cycle === 'string') patch.billing_cycle = normalizeBillingCycle(updates.billing_cycle);
        if (typeof updates.license_expires_at === 'string') patch.license_expires_at = updates.license_expires_at;
        if (typeof updates.max_users === 'number') patch.max_users = updates.max_users;
        if (patch.plan_type && !patch.subscription_plan) patch.subscription_plan = patch.plan_type;
      }

      if (updates.settings) {
        // Merge with existing settings server-side (avoid wiping unknown keys)
        const { data: existing } = await supabaseAdmin
          .from('organizations')
          .select('settings')
          .eq('id', orgId)
          .maybeSingle();
        patch.settings = { ...(existing?.settings || {}), ...(updates.settings || {}) };
      }

      if (typeof patch.license_expires_at === 'string' && updates.renew_license_from_today === true) {
        patch.trial_ends_at = patch.license_expires_at;
      }

      const { error } = await supabaseAdmin
        .from('organizations')
        .update(patch)
        .eq('id', orgId);

      if (error) throw error;

      await supabaseAdmin.rpc('log_super_admin_action', {
        p_action: 'update_org_license',
        p_target_org_id: orgId,
        p_target_user_id: null,
        p_details: patch,
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'update_org') {
      const { error } = await supabaseAdmin
        .from('organizations')
        .update({ name: updates.name, subscription_plan: updates.subscription_plan })
        .eq('id', orgId);
      
      if (error) throw error;

      await supabaseAdmin.rpc('log_super_admin_action', {
        p_action: 'update_org_profile',
        p_target_org_id: orgId,
        p_target_user_id: null,
        p_details: { name: updates.name, subscription_plan: updates.subscription_plan },
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'delete_org') {
      const { data: existing, error: existingErr } = await supabaseAdmin
        .from('organizations')
        .select('id, name, owner_id')
        .eq('id', orgId)
        .maybeSingle();

      if (existingErr) {
        console.error('delete_org fetch:', existingErr);
        return NextResponse.json({ error: existingErr.message }, { status: 500 });
      }

      if (!existing) {
        return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 });
      }

      if (superAdminUserId && existing.owner_id === superAdminUserId) {
        return NextResponse.json(
          {
            error:
              'No puedes eliminar la organización de la que eres titular (tu cuenta principal). Elimina otras organizaciones de clientes, no la tuya.',
          },
          { status: 403 }
        );
      }

      // Auditoría super_admin: la FK usa target_organization_id, no organization_id (el bucle anterior no borraba nada).
      const { error: auditDelErr } = await supabaseAdmin
        .from('super_admin_audit_log')
        .delete()
        .eq('target_organization_id', orgId);
      if (auditDelErr) {
        console.error('super_admin_audit_log delete:', auditDelErr);
        return NextResponse.json({ error: auditDelErr.message }, { status: 500 });
      }

      const tables = [
        'repair_tickets',
        'customers',
        'inventory_items',
        'expenses',
        'shop_settings',
        'organization_members',
      ];

      for (const table of tables) {
        const { error } = await supabaseAdmin.from(table).delete().eq('organization_id', orgId);
        if (error) console.error(`⚠️ ${table}:`, error.message);
      }

      const { error: deleteError } = await supabaseAdmin.from('organizations').delete().eq('id', orgId);

      if (deleteError) {
        console.error('❌ Delete error:', deleteError);
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }

      const { data: verify } = await supabaseAdmin.from('organizations').select('id').eq('id', orgId).maybeSingle();

      if (verify) {
        return NextResponse.json({ error: 'No se pudo eliminar' }, { status: 500 });
      }

      await supabaseAdmin.rpc('log_super_admin_action', {
        p_action: 'delete_organization',
        p_target_org_id: null,
        p_target_user_id: null,
        p_details: {
          hard_delete: true,
          deleted_organization_id: orgId,
          deleted_organization_name: existing.name,
        },
      });
      return NextResponse.json({ success: true, deleted: true });
    }

    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

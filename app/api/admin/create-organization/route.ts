import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSuperAdminFromRequest } from '@/lib/auth/super-admin-server';
import {
  adminPlanSelectValue,
  computeLicenseExpiresAt,
  licenseDefaultsForPlan,
  mergeOrgFeatures,
  normalizeBillingCycle,
} from '@/lib/org-plan';
import { currencyForCountry, type OrgCountry } from '@/lib/locale';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdminFromRequest(request);
    if (!auth.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });
    }

    const body = await request.json();
    const { name, email, password } = body;
    const planType = adminPlanSelectValue(body.plan_type || body.plan, null);
    const billingCycle = normalizeBillingCycle(body.billing_cycle || 'mensual');
    const license = licenseDefaultsForPlan(planType);
    const licenseExpiresAt = computeLicenseExpiresAt(billingCycle);
    const country: OrgCountry = 'AR';
    const currency = body.currency || currencyForCountry(country);

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return NextResponse.json({ error: `Error creando usuario: ${authError.message}` }, { status: 500 });
    }

    const userId = authData.user.id;
    const slug = `${name.toLowerCase().replace(/\s+/g, '-')}-${Math.floor(Math.random() * 1000)}`;

    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name,
        slug,
        owner_id: userId,
        subscription_status: 'active',
        plan_type: license.plan_type,
        billing_cycle: billingCycle,
        subscription_plan: license.subscription_plan,
        license_expires_at: licenseExpiresAt,
        trial_ends_at: licenseExpiresAt,
        max_users: license.max_users,
        max_tickets: planType === 'profesional' ? null : 500,
        features: mergeOrgFeatures({}, license.features),
        country,
        currency,
        settings: {
          currency,
          language: country === 'AR' ? 'es-AR' : 'es',
          timezone: country === 'AR' ? 'America/Argentina/Buenos_Aires' : 'Europe/Madrid',
        },
      })
      .select()
      .single();

    if (orgError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: `Error creando organización: ${orgError.message}` }, { status: 500 });
    }

    await supabaseAdmin.rpc('log_super_admin_action', {
      p_action: 'create_organization',
      p_target_org_id: orgData.id,
      p_target_user_id: userId,
      p_details: {
        name,
        email,
        plan_type: orgData.plan_type,
        billing_cycle: billingCycle,
        license_expires_at: licenseExpiresAt,
      },
    });

    // Copiar catálogo maestro de servicios a la organización (independiente por org)
    try {
      const { data: seedCount, error: seedErr } = await supabaseAdmin.rpc('seed_organization_services', {
        p_organization_id: orgData.id,
        p_user_id: userId,
      });
      if (seedErr) {
        console.error('[admin/create-organization] seed_services', seedErr);
      } else {
        console.log('[admin/create-organization] servicios copiados:', seedCount);
      }
    } catch (e) {
      console.error('[admin/create-organization] seed_services exception', e);
    }

    return NextResponse.json({
      success: true,
      data: {
        name: orgData.name,
        email,
        password,
        plan_type: orgData.plan_type,
        billing_cycle: billingCycle,
        license_expires_at: licenseExpiresAt,
        slug: orgData.slug,
        organization_id: orgData.id,
        user_id: userId,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

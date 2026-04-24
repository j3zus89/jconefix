import { createClient } from '@supabase/supabase-js';
import { parsePaypalCustomId } from '@/lib/paypal-order-meta';
import {
  computeLicenseExpiresAt,
  licenseDefaultsForPlan,
  mergeOrgFeatures,
} from '@/lib/org-plan';
import { notifyAdminNewUser } from '@/lib/notifications/admin-alert';

type CaptureBody = {
  status?: string;
  purchase_units?: Array<{
    custom_id?: string;
    payments?: { captures?: Array<{ status?: string }> };
  }>;
};

/**
 * Tras captura COMPLETED, si el pedido llevaba `custom_id` con organización (usuario logueado al crear el pedido),
 * activamos la licencia en Supabase.
 */
export async function activateOrganizationFromPaypalCapture(captureBody: unknown): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;

  const body = captureBody as CaptureBody;
  if (body.status !== 'COMPLETED') return;

  const pu = body.purchase_units?.[0];
  const cap = pu?.payments?.captures?.[0];
  if (cap?.status && cap.status !== 'COMPLETED') return;

  const parsed = parsePaypalCustomId(pu?.custom_id);
  if (!parsed) return;

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: orgRow, error: fetchErr } = await admin
    .from('organizations')
    .select('features')
    .eq('id', parsed.organizationId)
    .maybeSingle();

  if (fetchErr || !orgRow) {
    console.error('[paypal-sync-org] org fetch', fetchErr);
    return;
  }

  const license = licenseDefaultsForPlan(parsed.plan);
  const licenseExpiresAt = computeLicenseExpiresAt(parsed.cycle);
  const features = mergeOrgFeatures(orgRow.features as Record<string, unknown>, license.features);

  const { error } = await admin
    .from('organizations')
    .update({
      subscription_status: 'active',
      plan_type: license.plan_type,
      subscription_plan: license.subscription_plan,
      billing_cycle: parsed.cycle,
      license_expires_at: licenseExpiresAt,
      trial_ends_at: null,
      max_users: license.max_users,
      features,
    })
    .eq('id', parsed.organizationId);

  if (error) {
    console.error('[paypal-sync-org] update', error);
    return;
  }

  // Fetch org + owner details to notify Super Admin about the paid activation.
  const { data: orgDetail } = await admin
    .from('organizations')
    .select('name, owner_id')
    .eq('id', parsed.organizationId)
    .maybeSingle();

  if (orgDetail?.owner_id) {
    const { data: profileDetail } = await admin
      .from('profiles')
      .select('full_name')
      .eq('id', orgDetail.owner_id)
      .maybeSingle();

    const { data: userData } = await admin.auth.admin.getUserById(orgDetail.owner_id);

    const cycleLabel = parsed.cycle === 'anual' ? 'Anual' : 'Mensual';
    const planLabel = parsed.plan === 'profesional' ? 'Profesional' : parsed.plan;

    try {
      await notifyAdminNewUser({
        shopName: orgDetail.name ?? 'Taller desconocido',
        userName: profileDetail?.full_name ?? 'Sin nombre',
        email: userData?.user?.email ?? 'Sin email',
        country: 'Argentina',
        planType: `${planLabel} - ${cycleLabel} (PayPal)`,
      });
    } catch (e) {
      console.error('[paypal-sync-org] notifyAdminNewUser', e);
    }
  }
}

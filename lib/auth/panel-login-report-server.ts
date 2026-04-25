import { createClient } from '@supabase/supabase-js';
import type { PanelLoginReportSource } from '@/lib/auth/panel-login-types';
import { formatIpGeoLine, lookupIpGeo } from '@/lib/geo/ip-api-lookup';
import { notifyAdminPanelLogin } from '@/lib/notifications/login-alert-email';

const THROTTLE_MINUTES = 30;

/** Días para considerar una organización como "nueva" para notificaciones */
const NEW_ORG_DAYS = 7;

function formatCountryLabel(raw: string | null | undefined): string {
  const s = (raw || '').trim().toUpperCase();
  if (s === 'ES' || s === 'AR' || s.includes('ARGENTINA') || s.includes('ESPAÑA') || s === 'SPAIN') {
    return 'Argentina';
  }
  if (!raw?.trim()) return '—';
  return raw.trim();
}

type OrgLite = { name?: string; country?: string | null };

/** Verifica si la organización es "nueva" (creada en los últimos NEW_ORG_DAYS días) */
async function isNewOrganization(admin: any, orgId: string | null): Promise<boolean> {
  if (!orgId) return false;
  try {
    const { data: org } = await admin.from('organizations').select('created_at').eq('id', orgId).maybeSingle() as { data: { created_at?: string } | null };
    if (!org?.created_at) return false;
    const createdAt = new Date(org.created_at).getTime();
    const daysDiff = (Date.now() - createdAt) / (1000 * 60 * 60 * 24);
    return daysDiff <= NEW_ORG_DAYS;
  } catch {
    return false;
  }
}

/**
 * Tras login exitoso: auditoría siempre; correo solo si es organización nueva (o throttle).
 * Usa service role (insert en super_admin_audit_log y tabla throttle).
 */
export async function processPanelLoginReport(params: {
  userId: string;
  email: string;
  source: PanelLoginReportSource;
  device: string | null;
  ip: string | null;
}): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn('[panel-login-report] Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
    return;
  }

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const ipGeo = params.ip ? await lookupIpGeo(params.ip) : null;
  const connectionLocationLine = formatIpGeoLine(ipGeo);

  let orgId: string | null = null;
  let orgName = '—';
  let countryCode: string | null = null;

  try {
    const { data: profile } = await admin
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', params.userId)
      .maybeSingle();

    const displayName =
      [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim() || params.email;

    const { data: mem } = await admin
      .from('organization_members')
      .select('organization_id, organizations(name, country)')
      .eq('user_id', params.userId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    const memRow = mem as { organization_id?: string; organizations?: OrgLite } | null;
    const fromMem = memRow?.organizations;
    if (fromMem?.name && memRow?.organization_id) {
      orgId = memRow.organization_id;
      orgName = fromMem.name;
      countryCode = fromMem.country ?? null;
    } else {
      const { data: owned } = await admin
        .from('organizations')
        .select('id, name, country')
        .eq('owner_id', params.userId)
        .limit(1)
        .maybeSingle();
      if (owned) {
        orgId = owned.id;
        orgName = owned.name;
        countryCode = owned.country ?? null;
      }
    }

    const countryLabel = formatCountryLabel(countryCode);
    const sourceLabel = params.source === 'super_admin' ? 'Panel SUPER_ADMIN' : 'Panel taller';

    const orgNameSubject =
      params.source === 'super_admin' ? 'SUPER_ADMIN' : orgName === '—' ? 'Sin organización' : orgName;

    const { data: throttle } = await admin
      .from('panel_login_email_throttle')
      .select('last_sent_at')
      .eq('user_id', params.userId)
      .maybeSingle();

    // Solo notificar si la organización es nueva (creada en los últimos 7 días)
    const orgIsNew = await isNewOrganization(admin, orgId);

    const now = Date.now();
    const last = throttle?.last_sent_at ? new Date(throttle.last_sent_at as string).getTime() : 0;
    const throttleMs = THROTTLE_MINUTES * 60 * 1000;
    const shouldTryEmail = orgIsNew && (!last || now - last > throttleMs);

    let emailSent = false;
    if (shouldTryEmail) {
      emailSent = await notifyAdminPanelLogin({
        orgNameSubject,
        orgNameBody: params.source === 'super_admin' ? `SUPER_ADMIN (${orgName})` : orgName,
        userDisplayName: displayName,
        email: params.email,
        countryLabel,
        connectionLocationLine,
        device: params.device,
        at: new Date(),
        sourceLabel,
      });
      if (emailSent) {
        await admin.from('panel_login_email_throttle').upsert(
          { user_id: params.userId, last_sent_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        );
      }
    }

    const { error: auditErr } = await admin.from('super_admin_audit_log').insert({
      admin_user_id: params.userId,
      action: 'panel_login',
      target_organization_id: orgId,
      target_user_id: params.userId,
      details: {
        source: params.source,
        email: params.email,
        userDisplayName: displayName,
        orgName,
        countryLabel,
        connectionLocationLine,
        connectionGeo: ipGeo,
        device: (params.device || '').slice(0, 500),
        email_notification_sent: emailSent,
        email_skipped_cooldown: !shouldTryEmail,
      },
      ip_address: params.ip,
    });

    if (auditErr) {
      console.error('[panel-login-report] Auditoría:', auditErr.message);
    }
  } catch (e) {
    console.error('[panel-login-report]', e instanceof Error ? e.message : e);
  }
}

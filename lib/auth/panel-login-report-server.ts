import { createClient } from '@supabase/supabase-js';
import type { PanelLoginReportSource } from '@/lib/auth/panel-login-types';
import { formatIpGeoLine, lookupIpGeo } from '@/lib/geo/ip-api-lookup';
import { notifyAdminPanelLogin } from '@/lib/notifications/login-alert-email';

const THROTTLE_MINUTES = 30;
const NEW_USER_HOURS_CUTOFF = 24; // Considerar "nuevo" si se registró hace menos de 24h

function formatCountryLabel(raw: string | null | undefined): string {
  const s = (raw || '').trim().toUpperCase();
  if (s === 'ES' || s === 'AR' || s.includes('ARGENTINA') || s.includes('ESPAÑA') || s === 'SPAIN') {
    return 'Argentina';
  }
  if (!raw?.trim()) return '—';
  return raw.trim();
}

type OrgLite = { name?: string; country?: string | null };

/**
 * Tras login exitoso: auditoría siempre; correo como mucho una vez cada THROTTLE_MINUTES por usuario.
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

    // Verificar si es usuario nuevo: primera conexión o registrado hace menos de 24h
    const { data: previousLogins } = await admin
      .from('super_admin_audit_log')
      .select('id, created_at')
      .eq('target_user_id', params.userId)
      .eq('action', 'panel_login')
      .order('created_at', { ascending: false })
      .limit(2);

    // Es nuevo si: no tiene logins previos ANTES de este, O se registró hace menos de 24h
    const hasPreviousLogins = (previousLogins?.length ?? 0) > 1; // >1 porque el login actual ya está siendo registrado

    // Verificar fecha de creación del perfil (si está disponible)
    let isRecentlyRegistered = false;
    try {
      const { data: userData } = await admin
        .from('profiles')
        .select('created_at')
        .eq('id', params.userId)
        .maybeSingle();
      if (userData?.created_at) {
        const hoursSinceRegistration = (Date.now() - new Date(userData.created_at).getTime()) / (1000 * 60 * 60);
        isRecentlyRegistered = hoursSinceRegistration <= NEW_USER_HOURS_CUTOFF;
      }
    } catch {
      // Si no podemos verificar, asumimos que no es reciente
      isRecentlyRegistered = false;
    }

    const isNewUser = !hasPreviousLogins || isRecentlyRegistered;

    // Solo enviar email si es usuario nuevo
    let emailSent = false;
    if (isNewUser) {
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
        email_skipped_not_new_user: !isNewUser,
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

import type { SupabaseClient } from '@supabase/supabase-js';
import { isUserRecordSuperAdmin } from '@/lib/auth/super-admin-allowlist';
import { PANEL_ONLINE_WINDOW_MS } from '@/lib/panel-presence';

/** Ventana para “¿hay agente ahora en el chat?”: más corta que el listado general (3 min). */
function supportPresenceWindowMs(): number {
  const raw = process.env.SUPPORT_AGENT_ONLINE_WINDOW_MS;
  if (raw !== undefined && raw !== '') {
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 15_000 && n <= PANEL_ONLINE_WINDOW_MS) return n;
  }
  return Math.min(PANEL_ONLINE_WINDOW_MS, 90_000);
}

/**
 * ¿Hay super admin con heartbeat reciente para transferencia en vivo en soporte?
 * Por defecto **90 s** (no 3 min): si cerraste el panel, dejás de figurar “en línea” para el chat pronto.
 * `SUPPORT_AGENT_ONLINE_WINDOW_MS` (15000–180000) lo ajusta; «Usuarios en línea» sigue usando 3 min.
 */
export async function isAnySuperAdminPanelOnline(admin: SupabaseClient): Promise<boolean> {
  const cutoffIso = new Date(Date.now() - supportPresenceWindowMs()).toISOString();
  const { data, error } = await admin
    .from('user_panel_sessions')
    .select('user_id')
    .gte('last_active_at', cutoffIso);
  if (error || !data?.length) return false;

  const seen = new Set<string>();
  const ids: string[] = [];
  for (const r of data as { user_id?: string }[]) {
    const id = r.user_id;
    if (typeof id !== 'string' || id.length === 0 || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }

  for (const uid of ids) {
    try {
      const { data: ures, error: uerr } = await admin.auth.admin.getUserById(uid);
      if (uerr || !ures?.user) continue;
      if (isUserRecordSuperAdmin(ures.user)) return true;
    } catch {
      /* siguiente */
    }
  }
  return false;
}

/**
 * Progreso de la guía "Puesta en marcha" en el escritorio (localStorage, por usuario + taller).
 * El cierre de la tarjeta (X) se guarda solo por usuario para que no reaparezca al cambiar de org o al volver a entrar.
 */

const STORAGE_KEY = 'jc_dashboard_onboarding_v1';
/** Mapa userId → true: el usuario cerró «Puesta en marcha» y no debe volver a mostrarse. */
const CHECKLIST_HIDDEN_KEY = 'jc_dashboard_onboarding_checklist_hidden_v1';
/**
 * Mapa userId → true: ya vio la guía «Puesta en marcha» (o la cerró con X) y no debe reaparecer en siguientes ingresos.
 * Se persiste en cuanto la tarjeta se muestra o al pulsar X (no solo al desmontar: recarga/cierre de pestaña fallaba antes).
 */
const HOME_ONBOARDING_DONE_KEY = 'jc_dashboard_onboarding_home_done_v1';

export type DashboardOnboardingSlice = {
  dismissed?: boolean;
  /** Usuario abrió Configuración al menos una vez desde que existe la guía. */
  settingsVisited?: boolean;
};

function compoundKey(userId: string, orgId: string | null): string {
  return `${userId}__${orgId ?? 'solo'}`;
}

function readAll(): Record<string, DashboardOnboardingSlice> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, DashboardOnboardingSlice>) : {};
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, DashboardOnboardingSlice>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota */
  }
}

function readChecklistHiddenSet(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CHECKLIST_HIDDEN_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function writeChecklistHiddenSet(data: Record<string, boolean>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CHECKLIST_HIDDEN_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota */
  }
}

function readHomeOnboardingDoneSet(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(HOME_ONBOARDING_DONE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function writeHomeOnboardingDoneSet(data: Record<string, boolean>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(HOME_ONBOARDING_DONE_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota */
  }
}

/** Ya no mostrar «Puesta en marcha» en el resumen (primer paso completado: una visita con la guía o cierre manual). */
export function isDashboardOnboardingHomeDone(userId: string): boolean {
  return readHomeOnboardingDoneSet()[userId] === true;
}

export function markDashboardOnboardingHomeDone(userId: string) {
  const set = readHomeOnboardingDoneSet();
  set[userId] = true;
  writeHomeOnboardingDoneSet(set);
}

/** Si el usuario cerró la tarjeta con la X: no volver a mostrarla (mismo usuario, cualquier sesión u org). */
export function isDashboardOnboardingChecklistHidden(userId: string): boolean {
  return readChecklistHiddenSet()[userId] === true;
}

export function markDashboardOnboardingChecklistHidden(userId: string) {
  const set = readChecklistHiddenSet();
  set[userId] = true;
  writeChecklistHiddenSet(set);
  markDashboardOnboardingHomeDone(userId);
}

/** Migra cierres viejos guardados por `userId__orgId` a la bandera global (un solo cierre válido para siempre). */
export function migrateLegacyOnboardingDismissToGlobal(userId: string) {
  if (isDashboardOnboardingChecklistHidden(userId)) {
    if (!isDashboardOnboardingHomeDone(userId)) markDashboardOnboardingHomeDone(userId);
    return;
  }
  const all = readAll();
  const prefix = `${userId}__`;
  for (const [k, v] of Object.entries(all)) {
    if (k.startsWith(prefix) && v.dismissed === true) {
      markDashboardOnboardingChecklistHidden(userId);
      return;
    }
  }
}

export function readDashboardOnboarding(userId: string, orgId: string | null): DashboardOnboardingSlice {
  return readAll()[compoundKey(userId, orgId)] ?? {};
}

export function patchDashboardOnboarding(
  userId: string,
  orgId: string | null,
  patch: Partial<DashboardOnboardingSlice>
) {
  const key = compoundKey(userId, orgId);
  const all = readAll();
  all[key] = { ...all[key], ...patch };
  writeAll(all);
}

/** Llamar al entrar en Configuración del panel. */
export function markDashboardOnboardingSettingsVisited(userId: string, orgId: string | null) {
  patchDashboardOnboarding(userId, orgId, { settingsVisited: true });
}

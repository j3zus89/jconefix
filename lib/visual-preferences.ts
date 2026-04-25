import type { CSSProperties } from 'react';

/**
 * Preferencias visuales del panel (localStorage).
 * El panel guarda tema/color **por usuario** (`readPanelVisualPreferences`) para que la primera
 * entrada no herede el estilo de otra cuenta en el mismo navegador (verde JC por defecto).
 * La clave legacy sigue sirviendo solo como respaldo en login / logo antiguo.
 */

export const VISUAL_PREFS_EVENT = 'jc-visual-prefs-changed';
export const VISUAL_PREFS_STORAGE_KEY = 'jc_visual_preferences_v1';

/** Logo opcional en pantallas sin sesión (login): se sincroniza al guardar personalización del panel. */
export const BRANDING_LOGO_SOLO_STORAGE_KEY = 'jc_branding_logo_dataurl_v1';

export function panelVisualPrefsStorageKey(userId: string): string {
  return `${VISUAL_PREFS_STORAGE_KEY}_u_${userId}`;
}

export type PanelThemeId = 'light' | 'dark_deep' | 'night_blue';

/** Familia visual del panel (paleta alineada con las landings; se combina con claro / oscuro / noche). */
export type PanelDesignId = 'classic' | 'heritage' | 'aurora' | 'studio';

export type VisualPreferencesState = {
  /** Capa cromática: superficies, acentos y barra superior armonizados por modo. */
  design: PanelDesignId;
  theme: PanelThemeId;
  /** #rrggbb */
  primaryHex: string;
  compactTables: boolean;
  /** data URL (png/jpeg/webp) o null */
  brandingLogoDataUrl: string | null;
  /** data URL del favicon (png/ico/svg) o null */
  faviconUrl: string | null;
};

export const DEFAULT_VISUAL_PREFERENCES: VisualPreferencesState = {
  design: 'classic',
  theme: 'light',
  primaryHex: '#0d9488',
  compactTables: false,
  brandingLogoDataUrl: null,
  faviconUrl: null,
};

export const PANEL_DESIGN_OPTIONS: {
  id: PanelDesignId;
  label: string;
  hint: string;
  /** Color corporativo recomendado para que botones y barra encajen con el estilo. */
  suggestedPrimary: string;
}[] = [
  {
    id: 'classic',
    label: 'Clásico',
    hint: 'El panel habitual: neutro y legible; tu color primario manda sin sorpresas.',
    suggestedPrimary: '#0d9488',
  },
  {
    id: 'heritage',
    label: 'Heritage Pro',
    hint: 'Como la landing clásica: fondos con matiz teal, acentos tipo lima en modo claro, profundidad en oscuros.',
    suggestedPrimary: '#124c48',
  },
  {
    id: 'aurora',
    label: 'Aurora',
    hint: 'Tono enterprise: fríos y esmeralda en oscuro, claros nítidos; barra más “nocturna”.',
    suggestedPrimary: '#10b981',
  },
  {
    id: 'studio',
    label: 'Studio',
    hint: 'Editorial cálido en claro; oscuros con gris cálido para menos choque que un gris puro.',
    suggestedPrimary: '#0f766e',
  },
];

const MAX_LOGO_BYTES = 450_000;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Convierte #RGB / #RRGGBB a triplete HSL para variables shadcn: "h s% l%" */
export function hexToHslTriplet(hex: string): { h: number; s: number; l: number; triplet: string } {
  let h = hex.replace(/^#/, '').trim();
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const n = parseInt(h, 16);
  if (h.length !== 6 || Number.isNaN(n)) {
    return { h: 173, s: 80, l: 32, triplet: '173 80% 32%' };
  }
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let hue = 0;
  const l = (max + min) / 2;
  if (d !== 0) {
    if (max === r) {
      hue = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    } else if (max === g) {
      hue = ((b - r) / d + 2) / 6;
    } else {
      hue = ((r - g) / d + 4) / 6;
    }
    hue *= 360;
  }
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return {
    h: hue,
    s: clamp(s * 100, 0, 100),
    l: clamp(l * 100, 0, 100),
    triplet: `${Math.round(hue)} ${Math.round(clamp(s * 100, 0, 100))}% ${Math.round(clamp(l * 100, 0, 100))}%`,
  };
}

export function primaryForegroundTripletForLightness(l: number): string {
  return l > 52 ? '0 0% 9%' : '0 0% 98%';
}

function parseVisualPreferencesJson(raw: string): VisualPreferencesState | null {
  try {
    const j = JSON.parse(raw) as Partial<VisualPreferencesState>;
    const design: PanelDesignId =
      j.design === 'heritage' ||
      j.design === 'aurora' ||
      j.design === 'studio' ||
      j.design === 'classic'
        ? j.design
        : 'classic';
    const theme: PanelThemeId =
      j.theme === 'dark_deep' || j.theme === 'night_blue' || j.theme === 'light'
        ? j.theme
        : 'light';
    const primaryHex =
      typeof j.primaryHex === 'string' && /^#[0-9A-Fa-f]{6}$/.test(j.primaryHex)
        ? j.primaryHex
        : DEFAULT_VISUAL_PREFERENCES.primaryHex;
    const compactTables = Boolean(j.compactTables);
    const brandingLogoDataUrl =
      typeof j.brandingLogoDataUrl === 'string' && j.brandingLogoDataUrl.startsWith('data:image/')
        ? j.brandingLogoDataUrl
        : null;
    const faviconUrl =
      typeof j.faviconUrl === 'string' && j.faviconUrl.startsWith('data:image/')
        ? j.faviconUrl
        : null;
    return { design, theme, primaryHex, compactTables, brandingLogoDataUrl, faviconUrl };
  } catch {
    return null;
  }
}

/**
 * Legacy (una sola clave por navegador): login y compatibilidad con datos viejos.
 * No usar para el tema del panel autenticado.
 */
export function readVisualPreferences(): VisualPreferencesState {
  if (typeof window === 'undefined') return { ...DEFAULT_VISUAL_PREFERENCES };
  try {
    const raw = localStorage.getItem(VISUAL_PREFS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_VISUAL_PREFERENCES };
    return parseVisualPreferencesJson(raw) ?? { ...DEFAULT_VISUAL_PREFERENCES };
  } catch {
    return { ...DEFAULT_VISUAL_PREFERENCES };
  }
}

/** Preferencias del panel para un usuario: sin datos guardados → verde clásico (#0d9488) y diseño clásico. */
export function readPanelVisualPreferences(userId: string): VisualPreferencesState {
  if (typeof window === 'undefined') return { ...DEFAULT_VISUAL_PREFERENCES };
  try {
    const raw = localStorage.getItem(panelVisualPrefsStorageKey(userId));
    if (!raw) return { ...DEFAULT_VISUAL_PREFERENCES };
    return parseVisualPreferencesJson(raw) ?? { ...DEFAULT_VISUAL_PREFERENCES };
  } catch {
    return { ...DEFAULT_VISUAL_PREFERENCES };
  }
}

function lastValidPrimaryForUser(userId: string): string {
  const p = readPanelVisualPreferences(userId).primaryHex;
  return /^#[0-9A-Fa-f]{6}$/.test(p) ? p : DEFAULT_VISUAL_PREFERENCES.primaryHex;
}

function syncBrandingLogoSideChannel(logo: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (logo?.startsWith('data:image/')) {
      localStorage.setItem(BRANDING_LOGO_SOLO_STORAGE_KEY, logo);
    } else {
      localStorage.removeItem(BRANDING_LOGO_SOLO_STORAGE_KEY);
    }
  } catch {
    /* quota / private mode */
  }
}

/**
 * Persiste la personalización del panel para un usuario. Dispara VISUAL_PREFS_EVENT.
 * Si `primaryHex` no es #RRGGBB válido, se conserva el último válido de ese usuario.
 */
export function writePanelVisualPreferences(userId: string, next: VisualPreferencesState): void {
  if (typeof window === 'undefined') return;
  const primaryHex = /^#[0-9A-Fa-f]{6}$/.test(next.primaryHex)
    ? next.primaryHex
    : lastValidPrimaryForUser(userId);
  const payload: VisualPreferencesState = { ...next, primaryHex };
  try {
    localStorage.setItem(panelVisualPrefsStorageKey(userId), JSON.stringify(payload));
    syncBrandingLogoSideChannel(payload.brandingLogoDataUrl);
    window.dispatchEvent(new Event(VISUAL_PREFS_EVENT));
  } catch {
    /* quota / private mode */
  }
}

/** Aplica tema semántico + color primario en <html> (solo con data-app-panel los temas oscuros tienen efecto completo en CSS). */
export function applyVisualPreferencesToDocument(prefs: VisualPreferencesState): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-panel-design', prefs.design);
  root.setAttribute('data-panel-theme', prefs.theme);
  if (prefs.compactTables) root.setAttribute('data-table-compact', '');
  else root.removeAttribute('data-table-compact');

  const { triplet, l } = hexToHslTriplet(prefs.primaryHex);
  const fg = primaryForegroundTripletForLightness(l);
  root.style.setProperty('--primary', triplet);
  root.style.setProperty('--primary-foreground', fg);
  root.style.setProperty('--ring', triplet);
}

export function fileToBrandingLogoDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Solo imágenes'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const r = String(reader.result || '');
      if (r.length > MAX_LOGO_BYTES) {
        reject(new Error('La imagen es demasiado grande (máx. ~450 KB)'));
        return;
      }
      resolve(r);
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}

export function getBrandingLogoFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const direct = localStorage.getItem(BRANDING_LOGO_SOLO_STORAGE_KEY);
    if (direct?.startsWith('data:image/')) return direct;
  } catch {
    /* ignore */
  }
  return readVisualPreferences().brandingLogoDataUrl;
}

/** Logo del panel para la sesión actual (por usuario); sin id, mismo criterio que login. */
export function getBrandingLogoForSignedInUser(userId: string | null | undefined): string | null {
  if (!userId) return getBrandingLogoFromStorage();
  return readPanelVisualPreferences(userId).brandingLogoDataUrl;
}

/** Variables semánticas (formato shadcn) para previsualización en tarjeta sin tocar <html>. */
/**
 * Solo color primario en línea: fondos y barra salen de `globals.css` vía
 * `.panel-preview-scope` + `data-panel-design` + `data-panel-theme` (igual que el panel real).
 */
export function buildPreviewInlineStyle(
  _design: PanelDesignId,
  _theme: PanelThemeId,
  primaryHex: string
): CSSProperties {
  const { triplet, l } = hexToHslTriplet(primaryHex);
  const fg = primaryForegroundTripletForLightness(l);
  return {
    '--primary': triplet,
    '--primary-foreground': fg,
    '--ring': triplet,
  } as CSSProperties;
}

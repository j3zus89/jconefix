/**
 * Cache del token WSAA (Ticket de Acceso) de AFIP.
 *
 * El token WSAA tiene validez de ~12 horas. Sin cache:
 *  - Se hace una llamada a AFIP WSAA en CADA request → lento + límite de rate.
 *
 * Estrategia doble:
 *  1. In-memory por proceso: rápido, cero latencia (funciona en instancias warm Vercel).
 *  2. Tabla `arca_wsaa_tokens` en Supabase: persiste entre cold-starts.
 *
 * El SDK @afipsdk/afip.js ya cachea en su servidor (app.afipsdk.com),
 * pero cada nueva instancia de `Afip` genera una llamada HTTP a ese servidor.
 * Aquí cacheamos la INSTANCIA configurada para evitar ese round-trip.
 *
 * NOTA DE SEGURIDAD: solo almacenamos el timestamp de expiración;
 * el token real viaja solo en la sesión TLS con app.afipsdk.com / AFIP.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

type CacheEntry = {
  /** Timestamp Unix (ms) en que expira. */
  expiresAt: number;
  /** Marca qué org+env representa (para verificación). */
  key: string;
};

/** Cache en memoria: clave → expiración. Solo indica "el SDK tiene token válido". */
const memoryCache = new Map<string, CacheEntry>();

/** Margen de seguridad: refrescar 5 min antes del vencimiento real. */
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

/** Los tokens WSAA de AFIP duran 12 horas. */
const TOKEN_VALID_MS = 12 * 60 * 60 * 1000;

function cacheKey(organizationId: string, production: boolean): string {
  return `${organizationId}:${production ? 'prod' : 'dev'}`;
}

/**
 * Devuelve true si hay token válido en memoria para esta org+env.
 * En ese caso, podemos reusar la instancia del SDK (force_create=false internamente).
 */
export function hasValidTokenInMemory(organizationId: string, production: boolean): boolean {
  const key = cacheKey(organizationId, production);
  const entry = memoryCache.get(key);
  if (!entry) return false;
  return Date.now() < entry.expiresAt - REFRESH_MARGIN_MS;
}

/**
 * Registra en memoria que acabamos de obtener un token fresco para esta org+env.
 * Llamar después de cualquier operación AFIP exitosa que requirió autenticación.
 */
export function markTokenObtained(organizationId: string, production: boolean): void {
  const key = cacheKey(organizationId, production);
  memoryCache.set(key, {
    key,
    expiresAt: Date.now() + TOKEN_VALID_MS,
  });
}

/**
 * Invalida el token en memoria (p.ej. si AFIP devuelve error de autenticación).
 */
export function invalidateToken(organizationId: string, production: boolean): void {
  memoryCache.delete(cacheKey(organizationId, production));
}

// ─── Persistencia en Supabase (cold-start recovery) ──────────────────────────

/** Guarda timestamp de expiración en DB para sobrevivir cold-starts. */
export async function persistTokenTimestamp(
  admin: SupabaseClient,
  organizationId: string,
  production: boolean
): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + TOKEN_VALID_MS).toISOString();
    await admin
      .from('arca_wsaa_tokens')
      .upsert(
        { organization_id: organizationId, production, expires_at: expiresAt, updated_at: new Date().toISOString() },
        { onConflict: 'organization_id,production' }
      );
  } catch {
    // Silencioso — el cache en memoria sigue siendo el principal
  }
}

/** Carga timestamp desde DB al arrancar (cold-start). */
export async function loadTokenFromDb(
  admin: SupabaseClient,
  organizationId: string,
  production: boolean
): Promise<boolean> {
  try {
    const { data } = await admin
      .from('arca_wsaa_tokens')
      .select('expires_at')
      .eq('organization_id', organizationId)
      .eq('production', production)
      .maybeSingle();
    if (!data?.expires_at) return false;
    const exp = new Date(data.expires_at as string).getTime();
    if (Date.now() < exp - REFRESH_MARGIN_MS) {
      // Token DB aún válido → cargar en memoria
      memoryCache.set(cacheKey(organizationId, production), { key: cacheKey(organizationId, production), expiresAt: exp });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Logging estructurado de operaciones AFIP/ARCA.
 * Escribe en la tabla `afip_logs` (solo service_role).
 * Nunca almacena certificados, claves privadas ni datos sensibles.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type AfipLogEntry = {
  organization_id?: string | null;
  cuit?: string | null;
  endpoint: string;
  result: 'ok' | 'fail' | 'skip' | 'mock';
  error_message?: string | null;
  detail?: Record<string, unknown> | null;
};

/**
 * Registra una operación AFIP en la tabla `afip_logs`.
 * Fallo silencioso: si el log no se puede guardar, NO bloquea el flujo.
 */
export async function logAfipOperation(
  admin: SupabaseClient,
  entry: AfipLogEntry
): Promise<void> {
  try {
    await admin.from('afip_logs').insert({
      organization_id: entry.organization_id ?? null,
      cuit: entry.cuit ?? null,
      endpoint: entry.endpoint,
      result: entry.result,
      error_message: entry.error_message ?? null,
      detail: entry.detail ?? null,
    });
  } catch (e) {
    // Log a consola como fallback — nunca bloquea el flujo de facturación
    console.error('[afip_logs] No se pudo guardar el log:', e);
  }
}

/** Helper para construir entry de éxito. */
export function afipLogOk(
  partial: Omit<AfipLogEntry, 'result'>
): AfipLogEntry {
  return { ...partial, result: 'ok' };
}

/** Helper para construir entry de fallo. */
export function afipLogFail(
  partial: Omit<AfipLogEntry, 'result'>,
  error: unknown
): AfipLogEntry {
  const msg = error instanceof Error ? error.message : String(error);
  return { ...partial, result: 'fail', error_message: msg.slice(0, 2000) };
}

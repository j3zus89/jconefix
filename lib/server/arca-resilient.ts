/**
 * Capa de resiliencia para llamadas AFIP: timeout + retry inteligente.
 *
 * AFIP no es estable. Este módulo envuelve cualquier llamada al SDK con:
 *  - Timeout de 15 s (configurable)
 *  - Hasta 3 reintentos en errores de RED (no en errores de negocio de AFIP)
 *  - Log de cada intento
 */

import { mapAfipSdkError } from '@/lib/server/arca-afip-client';

/** Errores de red/transporte que justifican reintentar. */
const NETWORK_ERROR_PATTERNS = [
  'enotfound', 'econnrefused', 'etimedout', 'econnreset',
  'socket hang up', 'network error', 'networkerror', 'fetch failed',
  'status code 503', 'status code 502', 'status code 504',
];

/** Errores de negocio AFIP que NO deben reintentarse (falla lógica, no de red). */
const BUSINESS_ERROR_PATTERNS = [
  'duplicado', 'duplicate', 'ya existe', 'already registered',
  'cuit', 'punto de venta', 'ptovta', 'condición iva',
  'unauthorized', 'certificate',
];

function isNetworkError(err: unknown): boolean {
  const raw = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return NETWORK_ERROR_PATTERNS.some((p) => raw.includes(p));
}

function isBusinessError(err: unknown): boolean {
  const raw = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return BUSINESS_ERROR_PATTERNS.some((p) => raw.includes(p));
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Ejecuta `fn` con timeout de `timeoutMs` ms.
 * Lanza `Error` con mensaje claro si se agota el tiempo.
 */
async function withTimeout<T>(fn: () => Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`AFIP no respondió en ${timeoutMs / 1000} s (${label}). Reintentando…`)),
        timeoutMs
      )
    ),
  ]);
}

export type ResilienceOptions = {
  /** Máx ms por intento. Default 15000. */
  timeoutMs?: number;
  /** Máximo de reintentos en error de red. Default 3. */
  maxRetries?: number;
  /** Label para logs (ej. "createNextVoucher"). */
  label?: string;
};

/**
 * Llama a `fn` con timeout + retry en errores de red.
 * Lanza el error AFIP mapeado si no hay más intentos.
 */
export async function callAfipResilient<T>(
  fn: () => Promise<T>,
  options: ResilienceOptions = {}
): Promise<T> {
  const { timeoutMs = 15_000, maxRetries = 3, label = 'afip' } = options;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await withTimeout(fn, timeoutMs, label);
      if (attempt > 1) {
        console.log(`[AFIP] ${label} OK en intento ${attempt}`);
      }
      return result;
    } catch (err) {
      lastErr = err;
      const isNet = isNetworkError(err);
      const isBiz = isBusinessError(err);

      if (isBiz) {
        // Error de negocio AFIP: NO reintentar
        console.warn(`[AFIP] ${label} error de negocio (sin retry): ${mapAfipSdkError(err)}`);
        throw err;
      }

      if (!isNet && attempt >= 2) {
        // Error desconocido después del primer intento: no seguir
        console.warn(`[AFIP] ${label} error desconocido (sin más retries): ${String(err)}`);
        throw err;
      }

      if (attempt < maxRetries) {
        const delay = 1_000 * attempt; // backoff lineal: 1s, 2s
        console.warn(`[AFIP] ${label} intento ${attempt}/${maxRetries} falló (red), reintentando en ${delay}ms…`);
        await sleep(delay);
      }
    }
  }

  throw lastErr;
}

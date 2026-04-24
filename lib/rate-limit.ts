/**
 * Rate limiter en memoria para Edge / Node.js.
 *
 * Algoritmo: ventana deslizante.
 * Limitaciones conocidas: en Vercel cada instancia serverless tiene su propio mapa;
 * para producción de alto tráfico considera Upstash Redis. Para el caso de uso
 * actual (proteger registro y login) esta implementación es suficiente.
 */

interface Window {
  count: number;
  resetAt: number; // timestamp ms cuando se reinicia la ventana
}

const store = new Map<string, Window>();

// Limpieza periódica para no acumular entradas caducadas indefinidamente
let lastCleanup = Date.now();
function maybeCleanup() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return; // limpia cada minuto
  lastCleanup = now;
  store.forEach((win, key) => {
    if (win.resetAt < now) store.delete(key);
  });
}

export interface RateLimitOptions {
  /** Tamaño de la ventana en milisegundos */
  windowMs: number;
  /** Número máximo de peticiones por ventana */
  max: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Peticiones restantes en la ventana actual */
  remaining: number;
  /** Timestamp (ms) en que se reinicia la ventana */
  resetAt: number;
}

/**
 * Comprueba y registra una petición para la clave dada (típicamente IP + ruta).
 */
export function checkRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  maybeCleanup();
  const now = Date.now();

  let win = store.get(key);
  if (!win || win.resetAt < now) {
    win = { count: 0, resetAt: now + opts.windowMs };
    store.set(key, win);
  }

  win.count += 1;
  const allowed = win.count <= opts.max;
  const remaining = Math.max(0, opts.max - win.count);

  return { allowed, remaining, resetAt: win.resetAt };
}

/** Construye la clave de rate-limit a partir del request */
export function getRateLimitKey(ip: string, route: string): string {
  return `rl:${route}:${ip}`;
}

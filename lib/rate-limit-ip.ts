/**
 * Rate limit muy simple en memoria (proceso). En serverless cada instancia tiene su contador;
 * sigue frenando abusos evidentes en un mismo nodo.
 */
const buckets = new Map<string, number[]>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_HITS = 8;

export function rateLimitOk(key: string): boolean {
  const now = Date.now();
  const prev = buckets.get(key) ?? [];
  const fresh = prev.filter((t) => now - t < WINDOW_MS);
  if (fresh.length >= MAX_HITS) {
    buckets.set(key, fresh);
    return false;
  }
  fresh.push(now);
  buckets.set(key, fresh);
  return true;
}

export function clientIpFromRequest(req: { headers: Headers }): string {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) {
    const first = xf.split(',')[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return 'unknown';
}

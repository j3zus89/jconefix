import { createClient } from '@/lib/supabase/client';
import type { Session } from '@supabase/supabase-js';

function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    let b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    return JSON.parse(atob(b64)) as { exp?: number };
  } catch {
    return null;
  }
}

/** True si el JWT expira en menos de `withinSec` segundos (o no se puede leer). */
function accessTokenNeedsRefresh(token: string | undefined, withinSec: number): boolean {
  if (!token) return true;
  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;
  if (typeof exp !== 'number') return true;
  return exp * 1000 < Date.now() + withinSec * 1000;
}

/** Un solo refresh en vuelo para no disparar 4× refresh en Promise.all */
let refreshInFlight: Promise<Session | null> | null = null;

async function refreshSessionOnce(supabase: ReturnType<typeof createClient>): Promise<Session | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) return null;
      return data.session ?? null;
    } catch {
      return null;
    } finally {
      setTimeout(() => {
        refreshInFlight = null;
      }, 2000);
    }
  })();
  return refreshInFlight;
}

/**
 * Peticiones al panel admin.
 * No llama a refreshSession en cada fetch (provoca 429 en Supabase y luego 401).
 * Solo renueva si no hay token o está a punto de caducar.
 */
export async function adminFetch(input: RequestInfo | URL, init?: RequestInit) {
  const supabase = createClient();

  let token: string | undefined;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    token = sessionData.session?.access_token;
  } catch {
    /* seguir */
  }

  if (accessTokenNeedsRefresh(token, 90)) {
    const session = await refreshSessionOnce(supabase);
    if (session?.access_token) token = session.access_token;
  }

  if (!token) {
    try {
      await supabase.auth.getUser();
      const { data: again } = await supabase.auth.getSession();
      token = again.session?.access_token;
    } catch {
      /* fetch solo con cookies */
    }
  }

  const headers = new Headers(init?.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);

  return fetch(input, {
    ...(init || {}),
    headers,
    cache: 'no-store',
    credentials: 'include',
  });
}


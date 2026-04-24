import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { mergeServerSetCookieOptions } from '@/lib/server-cookie-defaults';

/** Parsea la cabecera `Cookie` (misma petición que llega a la ruta API). */
function parseCookieHeader(header: string): { name: string; value: string }[] {
  if (!header.trim()) return [];
  const out: { name: string; value: string }[] = [];
  for (const segment of header.split(';')) {
    const s = segment.trim();
    if (!s) continue;
    const eq = s.indexOf('=');
    if (eq <= 0) continue;
    const name = s.slice(0, eq).trim();
    let value = s.slice(eq + 1).trim();
    if (value.includes('%')) {
      try {
        value = decodeURIComponent(value);
      } catch {
        /* valor tal cual */
      }
    }
    if (name) out.push({ name, value });
  }
  return out;
}

function cookieRowsForRequest(request: Request): { name: string; value: string }[] {
  const raw = request.headers.get('cookie') ?? '';
  if (raw.trim().length > 0) {
    return parseCookieHeader(raw);
  }
  const nextReq = request as NextRequest;
  if (typeof nextReq.cookies?.getAll === 'function') {
    return nextReq.cookies.getAll();
  }
  return [];
}

/**
 * Cliente Supabase ligado a las cookies **de esta petición** (App Router route handlers).
 * Prioriza la cabecera `Cookie` (lo que el navegador envió); en Vercel a veces `cookies.getAll()` viene vacío.
 */
export function createSupabaseServerClientFromRequest(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieRowsForRequest(request);
      },
      setAll() {
        /* La ruta devuelve JSON; el refresh lo hace el cliente / middleware. */
      },
    },
  });
}

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, mergeServerSetCookieOptions(options));
            });
          } catch {
            // Server Components pueden no poder mutar cookies; la lectura de sesión sigue funcionando.
          }
        },
      },
    }
  );
}

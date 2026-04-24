import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getRateLimitKey } from '@/lib/rate-limit';
import {
  allOrganizationsAdminClosedForSelfService,
  orgBillingAccessBlocked,
} from '@/lib/billing-expiry-warning';
import { fetchOrgBillingSnapshotsForUser } from '@/lib/fetch-org-billing-snapshots-admin';
import { mergeServerSetCookieOptions } from '@/lib/server-cookie-defaults';

/**
 * Rutas públicas con rate limiting estricto para evitar fuerza bruta y abuso.
 * Clave: prefijo de path → opciones { windowMs, max }
 */
const RATE_LIMITED_ROUTES: Array<{ prefix: string; windowMs: number; max: number }> = [
  // Registro de prueba: máximo 5 intentos por minuto por IP
  { prefix: '/api/public/register-trial',   windowMs: 60_000, max: 5 },
  // Solicitud comercial: máximo 5 por minuto
  { prefix: '/api/public/commercial-signup', windowMs: 60_000, max: 5 },
  // PayPal: máximo 20 por minuto (flujos de pago)
  { prefix: '/api/paypal',                  windowMs: 60_000, max: 20 },
];

function applyRateLimit(req: NextRequest): NextResponse | null {
  const { pathname } = req.nextUrl;
  const rule = RATE_LIMITED_ROUTES.find(r => pathname.startsWith(r.prefix));
  if (!rule) return null;

  // Obtener IP real — Vercel inyecta x-forwarded-for
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '0.0.0.0';

  const key = getRateLimitKey(ip, rule.prefix);
  const result = checkRateLimit(key, { windowMs: rule.windowMs, max: rule.max });

  if (!result.allowed) {
    const retryAfterSec = Math.ceil((result.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { error: 'Demasiadas peticiones. Espera un momento e inténtalo de nuevo.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSec),
          'X-RateLimit-Limit': String(rule.max),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
        },
      }
    );
  }

  return null; // petición permitida
}

function orgAccessBlocked(org: {
  subscription_status?: string | null;
  trial_ends_at?: string | null;
  license_expires_at?: string | null;
  license_unlimited?: boolean | null;
}): boolean {
  return orgBillingAccessBlocked(org, Date.now());
}

/** Cookie que almacena la región detectada o elegida manualmente. Dura 1 año. */
const GEO_COOKIE = 'jc_region';
const GEO_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Establece la cookie de región si todavía no existe.
 * La manual-override del usuario (guardada en esa misma cookie) tiene prioridad:
 * si ya existe no se sobreescribe.
 */
function applyGeoCookie(req: NextRequest, response: NextResponse): NextResponse {
  if (req.cookies.get(GEO_COOKIE)) return response; // ya hay preferencia guardada
  const country = req.headers.get('x-vercel-ip-country') ?? 'AR';
  const region = country === 'AR' ? 'AR' : 'AR';
  response.cookies.set(
    GEO_COOKIE,
    region,
    mergeServerSetCookieOptions({
      path: '/',
      maxAge: GEO_MAX_AGE,
      sameSite: 'lax',
      httpOnly: false, // lectura en cliente (región); el merge respeta httpOnly: false
    }),
  );
  return response;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Rate limiting en rutas API públicas críticas ──────────────────────────
  const rateLimitResponse = applyRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  // ── Solo páginas /admin (no /api/admin/*): cada fetch al API dispararía getUser aquí y
  // saturaba refresh_token en Supabase → 429 → 401. Las APIs usan Bearer + cookies del navegador.
  if (pathname.startsWith('/admin')) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
      return NextResponse.next();
    }
    let response = NextResponse.next();
    const supabaseAuth = createServerClient(supabaseUrl, anonKey, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, mergeServerSetCookieOptions(options));
          });
        },
      },
    });
    try {
      await supabaseAuth.auth.getUser();
    } catch (e) {
      console.error('[middleware] admin Supabase session refresh:', e);
    }
    return response;
  }

  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // ── Páginas públicas (landing, register…) ─────────────────────────────────
  if (!pathname.startsWith('/dashboard') && !pathname.startsWith('/checkout')) {
    return applyGeoCookie(req, NextResponse.next());
  }

  // ── Dashboard y checkout (sesión + estado de organización) ───────────────
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !anonKey || !serviceKey) {
      if (pathname.startsWith('/dashboard')) {
        return new NextResponse(
          'Configuración del servidor incompleta: faltan variables de Supabase. Revisá el despliegue.',
          { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
        );
      }
      return applyGeoCookie(req, NextResponse.next());
    }

    let response = NextResponse.next();

    const supabaseAuth = createServerClient(supabaseUrl, anonKey, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, mergeServerSetCookieOptions(options));
          });
        },
      },
    });

    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      if (pathname.startsWith('/checkout')) {
        return applyGeoCookie(req, NextResponse.next());
      }
      return response;
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const snapshots = await fetchOrgBillingSnapshotsForUser(admin, user.id);

    if (pathname.startsWith('/checkout')) {
      if (snapshots.length > 0 && allOrganizationsAdminClosedForSelfService(snapshots)) {
        return applyGeoCookie(
          req,
          NextResponse.redirect(new URL('/suspended?hard=1', req.url)),
        );
      }
      return applyGeoCookie(req, response);
    }

    if (snapshots.length === 0) {
      return response;
    }

    const anyAllowed = snapshots.some((org) => !orgAccessBlocked(org));

    if (!anyAllowed) {
      const qs = allOrganizationsAdminClosedForSelfService(snapshots) ? '?hard=1' : '';
      return NextResponse.redirect(new URL(`/suspended${qs}`, req.url));
    }

    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/dashboard',
    '/dashboard/:path*',
    // Rutas API públicas con rate limiting
    '/api/public/:path*',
    '/api/paypal/:path*',
    // Páginas públicas donde aplicamos la cookie de geo (sin auth Supabase)
    '/',
    '/landing-a',
    '/landing-b',
    '/checkout',
    '/checkout/:path*',
    '/register',
    // Guías SEO públicas (/comparar/*)
    '/comparar',
    '/comparar/:path*',
    // Demo pública de animaciones de marca (misma UI que /dashboard/branding-animations)
    '/demo-marca-animaciones',
  ],
};

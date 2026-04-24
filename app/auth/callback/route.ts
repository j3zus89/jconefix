import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { processPanelLoginReport } from '@/lib/auth/panel-login-report-server';
import { mergeServerSetCookieOptions } from '@/lib/server-cookie-defaults';

/**
 * Supabase Auth callback.
 *
 * Maneja dos flujos:
 *  - type=recovery  → el usuario llegó desde el email de recuperación de contraseña
 *  - type=signup    → confirmación de cuenta nueva (si se activa en Supabase Dashboard)
 *
 * Supabase redirige aquí con ?code=<pkce_code>&next=<path>.
 * Intercambiamos el code por una sesión y redirigimos al destino final.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code  = searchParams.get('code');
  const type  = searchParams.get('type');          // 'recovery' | 'signup' | ...
  const next  = searchParams.get('next') ?? '/dashboard';

  if (!code) {
    // Sin código no hay nada que intercambiar
    return NextResponse.redirect(`${origin}/login?error=invalid_link`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, mergeServerSetCookieOptions(options)),
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession error:', error.message);
    return NextResponse.redirect(`${origin}/login?error=expired_link`);
  }

  // Si es recuperación de contraseña → ir a la página de nueva contraseña (sin alerta de login)
  if (type === 'recovery') {
    return NextResponse.redirect(`${origin}/reset-password`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id) {
    const hdrs = request.headers;
    const fwd = hdrs.get('x-forwarded-for');
    const ip =
      fwd?.split(',')[0]?.trim() ||
      hdrs.get('x-real-ip') ||
      hdrs.get('cf-connecting-ip') ||
      null;
    await processPanelLoginReport({
      userId: user.id,
      email: user.email ?? '',
      source: 'panel',
      device: hdrs.get('user-agent'),
      ip,
    });
  }

  // Cualquier otro flujo (signup, etc.) → ir al dashboard o a `next`
  return NextResponse.redirect(`${origin}${next}`);
}

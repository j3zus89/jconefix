import { NextResponse } from 'next/server';
import { createSupabaseServerClientFromRequest } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) {
    const first = fwd.split(',')[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get('x-real-ip')?.trim();
  if (real) return real;
  return '';
}

function isPrivateOrLocalIp(ip: string): boolean {
  if (!ip) return true;
  if (ip === '::1') return true;
  if (ip.startsWith('127.')) return true;
  if (ip.startsWith('10.')) return true;
  if (ip.startsWith('192.168.')) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;
  return false;
}

async function resolveLocationLabel(ip: string): Promise<string | null> {
  if (isPrivateOrLocalIp(ip)) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const r = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?output=json`, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(t);
    if (!r.ok) return null;
    const j = (await r.json()) as { success?: boolean; city?: string; country?: string };
    if (j.success === false) return null;
    const parts = [j.city, j.country].filter((x) => x && String(x).trim());
    return parts.length ? parts.join(', ') : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseServerClientFromRequest(request);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    let body: { client_key?: string; user_agent?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }

    const clientKey = String(body.client_key ?? '').trim();
    if (!clientKey || clientKey.length > 120) {
      return NextResponse.json({ error: 'client_key inválido' }, { status: 400 });
    }

    const ua = String(body.user_agent ?? '').slice(0, 1024);
    const ip = clientIp(request);
    const locationLabel = ip ? await resolveLocationLabel(ip) : null;

    const { error } = await supabase.from('user_panel_sessions').upsert(
      {
        user_id: user.id,
        client_key: clientKey,
        user_agent: ua || null,
        ip_address: ip || null,
        location_label: locationLabel,
        last_active_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,client_key' }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

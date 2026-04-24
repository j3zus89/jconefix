import { NextRequest, NextResponse } from 'next/server';

/**
 * Temperatura actual (°C) vía Open-Meteo, desde el servidor.
 * Evita bloqueos de extensiones / CORS raros al llamar open-meteo desde el cliente.
 */
export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get('lat');
  const lon = req.nextUrl.searchParams.get('lon');
  if (!lat || !lon) {
    return NextResponse.json({ error: 'missing_coords' }, { status: 400 });
  }
  const la = Number(lat);
  const lo = Number(lon);
  if (!Number.isFinite(la) || !Number.isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) {
    return NextResponse.json({ error: 'invalid_coords' }, { status: 400 });
  }

  try {
    const u = new URL('https://api.open-meteo.com/v1/forecast');
    u.searchParams.set('latitude', String(la));
    u.searchParams.set('longitude', String(lo));
    u.searchParams.set('current', 'temperature_2m');
    u.searchParams.set('timezone', 'auto');

    const res = await fetch(u.toString(), {
      next: { revalidate: 600 },
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'upstream', status: res.status }, { status: 502 });
    }
    const j = (await res.json()) as { current?: { temperature_2m?: number } };
    const t = j.current?.temperature_2m;
    const temp = typeof t === 'number' && !Number.isNaN(t) ? Math.round(t) : null;

    return NextResponse.json(
      { temp },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
        },
      }
    );
  } catch {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 502 });
  }
}

import { NextRequest, NextResponse } from 'next/server';

/**
 * Geocodificación inversa (lat/lon → ciudad) vía Nominatim OSM.
 * Uso acorde a la política de uso: User-Agent identificable, sin abuso de frecuencia.
 */
export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get('lat');
  const lon = req.nextUrl.searchParams.get('lon');
  if (!lat || !lon) {
    return NextResponse.json({ error: 'missing_coords' }, { status: 400 });
  }
  const latN = Number(lat);
  const lonN = Number(lon);
  if (!Number.isFinite(latN) || !Number.isFinite(lonN) || Math.abs(latN) > 90 || Math.abs(lonN) > 180) {
    return NextResponse.json({ error: 'invalid_coords' }, { status: 400 });
  }

  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('lat', String(latN));
    url.searchParams.set('lon', String(lonN));
    url.searchParams.set('zoom', '10');
    url.searchParams.set('addressdetails', '1');

    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'JCOneFixDashboard/1.0 (https://jconefix.com.ar; soporte@jconefix.com.ar)',
        Accept: 'application/json',
      },
      next: { revalidate: 86_400 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'upstream', status: res.status }, { status: 502 });
    }

    const j = (await res.json()) as {
      address?: Record<string, string>;
    };
    const a = j.address || {};
    const city =
      a.city ||
      a.town ||
      a.village ||
      a.municipality ||
      a.county ||
      a.state_district ||
      a.state ||
      '';
    const country = a.country || '';
    const label = [city, country].filter(Boolean).join(', ');

    return NextResponse.json(
      { label: label || null, city: city || null, country: country || null },
      { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400' } }
    );
  } catch {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 502 });
  }
}

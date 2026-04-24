import { NextRequest, NextResponse } from 'next/server';
import { lookupIpGeo } from '@/lib/geo/ip-api-lookup';

/**
 * Ubicación aproximada por IP (sin GPS). Útil si el usuario no otorga geolocalización.
 * ip-api.com: límite gratuito; IPv6 puede no resolverse en tier gratuito.
 */
export async function GET(req: NextRequest) {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip =
    forwarded?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    '';

  if (!ip || ip === '127.0.0.1' || ip === '::1') {
    return NextResponse.json({
      lat: null,
      lon: null,
      city: null,
      region: null,
      country: null,
      source: 'local',
    });
  }

  try {
    const geo = await lookupIpGeo(ip, { revalidateSeconds: 3600 });
    if (!geo) {
      return NextResponse.json({
        lat: null,
        lon: null,
        city: null,
        region: null,
        country: null,
        source: 'fail',
      });
    }
    return NextResponse.json({
      lat: geo.lat,
      lon: geo.lon,
      city: geo.city,
      region: geo.region,
      country: geo.country,
      source: 'ip',
    });
  } catch {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 502 });
  }
}

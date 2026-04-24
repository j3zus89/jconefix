/**
 * Geolocalización aproximada por IP vía ip-api.com (tier gratuito: HTTP, ~45 req/min).
 * regionName = provincia / estado / comunidad autónoma según el país.
 */
export type IpGeoLookup = {
  lat: number | null;
  lon: number | null;
  city: string | null;
  /** Provincia, estado, CA, etc. */
  region: string | null;
  country: string | null;
};

export function formatIpGeoLine(g: IpGeoLookup | null): string {
  if (!g) return '—';
  const parts = [g.city, g.region, g.country].map((x) => (x || '').trim()).filter(Boolean);
  return parts.length ? parts.join(', ') : '—';
}

export async function lookupIpGeo(
  ip: string,
  options?: { /** p. ej. 3600 para cachear respuestas del widget del panel */ revalidateSeconds?: number }
): Promise<IpGeoLookup | null> {
  const trimmed = (ip || '').trim();
  if (!trimmed || trimmed === '127.0.0.1' || trimmed === '::1') {
    return null;
  }

  const fetchInit =
    options?.revalidateSeconds != null
      ? ({ next: { revalidate: options.revalidateSeconds } } as const)
      : ({ cache: 'no-store' } as const);

  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(trimmed)}?fields=status,lat,lon,city,country,regionName`,
      fetchInit
    );
    if (!res.ok) return null;
    const j = (await res.json()) as {
      status?: string;
      lat?: number;
      lon?: number;
      city?: string;
      country?: string;
      regionName?: string;
    };
    if (j.status !== 'success') return null;
    return {
      lat: typeof j.lat === 'number' && !Number.isNaN(j.lat) ? j.lat : null,
      lon: typeof j.lon === 'number' && !Number.isNaN(j.lon) ? j.lon : null,
      city: j.city?.trim() || null,
      region: j.regionName?.trim() || null,
      country: j.country?.trim() || null,
    };
  } catch {
    return null;
  }
}

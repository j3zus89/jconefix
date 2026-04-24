'use client';

import { useEffect, useRef, useState } from 'react';
import { CloudSun } from 'lucide-react';

const WEATHER_POLL_MS = 10 * 60 * 1000;
/** Reloj del panel: cada 5 s basta para la barra de estado (antes 1 s generaba muchos re-renders). */
const CLOCK_TICK_MS = 5000;
/** Geolocalización y clima un poco después del primer paint para no bloquear la carga. */
const GEO_DEFER_MS = 900;

type Coords = {
  lat: number;
  lon: number;
  cityLine: string | null;
  source: 'gps' | 'ip' | 'tz';
};

function formatDateEs(d: Date): string {
  return d
    .toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    })
    .replace(/\.$/, '');
}

function formatTimeEs(d: Date): string {
  return d.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/**
 * Sin GPS ni IP válida (localhost, IPv6 sin soporte, etc.): clima aproximado según zona horaria.
 */
function approximateCoordsFromTimeZone(): { lat: number; lon: number; label: string } | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz?.startsWith('America/Argentina/')) return null;
    const suffix = tz.replace('America/Argentina/', '');
    const zones: Record<string, { lat: number; lon: number }> = {
      Buenos_Aires: { lat: -34.6037, lon: -58.3816 },
      Catamarca: { lat: -28.4696, lon: -65.7792 },
      Cordoba: { lat: -31.4201, lon: -64.1888 },
      Jujuy: { lat: -24.1858, lon: -65.2995 },
      La_Rioja: { lat: -29.4131, lon: -66.8558 },
      Mendoza: { lat: -32.8908, lon: -68.8272 },
      Salta: { lat: -24.7821, lon: -65.4232 },
      San_Juan: { lat: -31.5375, lon: -68.5364 },
      San_Luis: { lat: -33.295, lon: -66.3356 },
      Santa_Fe: { lat: -31.6333, lon: -60.7 },
      Santiago_del_Estero: { lat: -27.7833, lon: -64.2667 },
      Tucuman: { lat: -26.8083, lon: -65.2176 },
      Ushuaia: { lat: -54.8019, lon: -68.303 },
    };
    const p = zones[suffix] ?? zones.Buenos_Aires;
    const pretty = suffix.replace(/_/g, ' ');
    return { lat: p.lat, lon: p.lon, label: `${pretty} (aprox. zona horaria)` };
  } catch {
    return null;
  }
}

async function fetchTempViaApi(lat: number, lon: number): Promise<number | null> {
  try {
    const res = await fetch(
      `/api/weather-current?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return null;
    const j = (await res.json()) as { temp?: number | null; error?: string };
    if (j.error) return null;
    return typeof j.temp === 'number' && !Number.isNaN(j.temp) ? j.temp : null;
  } catch {
    return null;
  }
}

async function reverseLabel(lat: number, lon: number): Promise<string | null> {
  try {
    const g = await fetch(
      `/api/reverse-geocode?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}`
    );
    if (!g.ok) return null;
    const j = (await g.json()) as { label?: string | null };
    return j.label?.trim() || null;
  } catch {
    return null;
  }
}

type ClockProps = { compact?: boolean };

export function DashboardLocalWeatherClock({ compact = false }: ClockProps) {
  const [now, setNow] = useState(() => new Date());
  const [coords, setCoords] = useState<Coords | null>(null);
  const [temp, setTemp] = useState<number | null>(null);
  const [tempFetchedOnce, setTempFetchedOnce] = useState(false);
  const coordsLockedRef = useRef(false);
  const geoSettledRef = useRef(false);

  const setCoordsOnce = (c: Coords) => {
    coordsLockedRef.current = true;
    setCoords(c);
  };

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), CLOCK_TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const tryTimeZoneFallback = () => {
      if (cancelled || coordsLockedRef.current) return;
      const fb = approximateCoordsFromTimeZone();
      if (fb) {
        setCoordsOnce({
          lat: fb.lat,
          lon: fb.lon,
          cityLine: fb.label,
          source: 'tz',
        });
      }
    };

    const finishIp = async (): Promise<void> => {
      try {
        const res = await fetch('/api/geo-ip', { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const j = (await res.json()) as {
          lat?: number | null;
          lon?: number | null;
          city?: string | null;
          region?: string | null;
          country?: string | null;
        };
        if (j.lat == null || j.lon == null || cancelled) return;
        const line =
          [j.city, j.region, j.country].map((x) => (x || '').trim()).filter(Boolean).join(', ') ||
          null;
        setCoordsOnce({ lat: j.lat, lon: j.lon, cityLine: line, source: 'ip' });
      } catch {
        /* ignore */
      }
    };

    const finishGps = async (lat: number, lon: number) => {
      const line = await reverseLabel(lat, lon);
      if (cancelled) return;
      setCoordsOnce({ lat, lon, cityLine: line, source: 'gps' });
    };

    const defer = window.setTimeout(() => {
      const afterNoGps = async () => {
        geoSettledRef.current = true;
        await finishIp();
        if (!cancelled && !coordsLockedRef.current) tryTimeZoneFallback();
      };

      if (!navigator.geolocation) {
        void afterNoGps();
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          geoSettledRef.current = true;
          void finishGps(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          void afterNoGps();
        },
        { enableHighAccuracy: false, timeout: 12_000, maximumAge: 300_000 }
      );
    }, GEO_DEFER_MS);

    /** Solo si GPS sigue pendiente: evitar competir con getCurrentPosition (timeout 12s). */
    const safetyTz = window.setTimeout(() => {
      if (cancelled || coordsLockedRef.current || geoSettledRef.current) return;
      tryTimeZoneFallback();
    }, 13_000);

    return () => {
      cancelled = true;
      window.clearTimeout(defer);
      window.clearTimeout(safetyTz);
    };
  }, []);

  useEffect(() => {
    if (!coords) return;
    let cancelled = false;
    setTemp(null);
    setTempFetchedOnce(false);

    const load = async () => {
      const t = await fetchTempViaApi(coords.lat, coords.lon);
      if (!cancelled) {
        setTemp(t);
        setTempFetchedOnce(true);
      }
    };

    void load();
    const id = window.setInterval(() => void load(), WEATHER_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [coords]);

  const dateStr = formatDateEs(now);
  const timeStr = formatTimeEs(now);
  const cityLine = coords?.cityLine;

  const sz = compact ? 'text-[11px] leading-snug' : 'text-[11px] leading-snug text-gray-600';
  const iconCls = compact ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const dotCls = compact ? 'text-primary/40' : 'text-gray-300';
  const numCls = compact ? 'font-semibold text-gray-900' : 'text-gray-700';

  const locHint =
    coords?.source === 'gps'
      ? 'Ubicación por GPS. Temperatura: Open-Meteo en tu servidor.'
      : coords?.source === 'ip'
        ? 'Ubicación aproximada por IP. Temperatura en esas coordenadas.'
        : coords?.source === 'tz'
          ? 'Sin IP/GPS: clima aproximado según zona horaria Argentina.'
          : 'Obteniendo ubicación…';

  return (
    <div
      className={`flex shrink-0 items-center gap-x-1 whitespace-nowrap ${sz}`}
      title={locHint}
    >
      {!compact ? (
        <span className="text-gray-300" aria-hidden>
          |
        </span>
      ) : null}
      <CloudSun className={`${iconCls} shrink-0 text-primary`} aria-hidden />
      <span className={`tabular-nums ${numCls}`}>
        {temp !== null ? `${temp}°` : !coords ? '—' : !tempFetchedOnce ? '…' : '—'}
      </span>
      <span className={dotCls} aria-hidden>
        ·
      </span>
      <span className={`tabular-nums ${numCls}`}>{timeStr}</span>
      <span className={dotCls} aria-hidden>
        ·
      </span>
      <span className={`capitalize ${numCls}`}>{dateStr}</span>
      {cityLine ? (
        <>
          <span className={dotCls} aria-hidden>
            ·
          </span>
          <span className={compact ? 'text-gray-700' : ''} title={cityLine}>
            {cityLine}
          </span>
        </>
      ) : !coords ? (
        <>
          <span className={dotCls} aria-hidden>
            ·
          </span>
          <span className="text-gray-400 italic">ubicación…</span>
        </>
      ) : null}
    </div>
  );
}

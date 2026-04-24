'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { DashboardLocalWeatherClock } from '@/components/dashboard/DashboardLocalWeatherClock';

type Pair = { compra: number | null; venta: number | null };

type RatesPayload = {
  source?: string;
  lastUpdate: string | null;
  rates?: {
    oficial: Pair;
    blue: Pair;
    bolsa: Pair;
    contadoconliqui: Pair;
    tarjeta: Pair;
    cripto: Pair;
  };
};

const POLL_MS = 10 * 60 * 1000;

function formatArs(n: number | null): string {
  if (n == null || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function cv(a: Pair): string {
  return `${formatArs(a.compra)}/${formatArs(a.venta)}`;
}

function formatTimeHint(iso: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

type StripVariant = 'standalone' | 'toolbar';

export function ArgentinaUsdRatesStrip({ variant = 'standalone' }: { variant?: StripVariant }) {
  const [data, setData] = useState<RatesPayload | null>(null);
  const [err, setErr] = useState(false);
  const toolbar = variant === 'toolbar';

  const load = async () => {
    try {
      const res = await fetch('/api/ars-usd-rates', { cache: 'no-store' });
      if (!res.ok) {
        setErr(true);
        return;
      }
      const j = (await res.json()) as RatesPayload & { error?: string };
      if (j.error || !j.rates) {
        setErr(true);
        return;
      }
      setErr(false);
      setData(j);
    } catch {
      setErr(true);
    }
  };

  useEffect(() => {
    let intervalId: number | undefined;
    let idleId: number | undefined;
    let timeoutId: number | undefined;

    const startPolling = () => {
      void load();
      intervalId = window.setInterval(() => void load(), POLL_MS);
    };

    // Primera carga después del pintado: no compite con el resto del dashboard
    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(() => startPolling(), { timeout: 2500 });
    } else {
      timeoutId = window.setTimeout(startPolling, 500);
    }

    const onFocus = () => void load();
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      if (intervalId != null) window.clearInterval(intervalId);
      if (idleId !== undefined && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId != null) window.clearTimeout(timeoutId);
    };
  }, []);

  const r = data?.rates;
  const hint = formatTimeHint(data?.lastUpdate ?? null);

  const labelCls = toolbar ? 'text-primary/80' : 'text-gray-400';
  const numCls = toolbar ? 'font-semibold text-gray-900' : 'text-gray-600';
  const dotCls = toolbar ? 'text-primary/50' : 'text-gray-300';
  const usdCls = toolbar ? 'font-semibold text-primary' : 'font-medium text-gray-400';

  const ratesBlock = (
    <>
      <span className={cn('shrink-0 tabular-nums', usdCls)}>USD</span>
      {err && !r ? (
        <span className="text-gray-400">Sin cotiz.</span>
      ) : r ? (
        <>
          <span className={cn('shrink-0 tabular-nums', labelCls)}>Of.</span>{' '}
          <span className={cn('shrink-0 tabular-nums', numCls)}>{cv(r.oficial)}</span>
          <span className={dotCls} aria-hidden>
            ·
          </span>
          <span className={cn('shrink-0 tabular-nums', labelCls)}>Blue</span>{' '}
          <span className={cn('shrink-0 tabular-nums', numCls)}>{cv(r.blue)}</span>
          <span className={dotCls} aria-hidden>
            ·
          </span>
          <span className={cn('shrink-0 tabular-nums', labelCls)}>MEP</span>{' '}
          <span className={cn('shrink-0 tabular-nums', numCls)}>{cv(r.bolsa)}</span>
          <span className={dotCls} aria-hidden>
            ·
          </span>
          <span className={cn('shrink-0 tabular-nums', labelCls)}>CCL</span>{' '}
          <span className={cn('shrink-0 tabular-nums', numCls)}>{cv(r.contadoconliqui)}</span>
          <span className={dotCls} aria-hidden>
            ·
          </span>
          <span className={cn('shrink-0 tabular-nums', labelCls)}>Tarj.</span>{' '}
          <span className={cn('shrink-0 tabular-nums', numCls)}>{cv(r.tarjeta)}</span>
          <span className={dotCls} aria-hidden>
            ·
          </span>
          <span className={cn('shrink-0 tabular-nums', labelCls)}>Cripto</span>{' '}
          <span className={cn('shrink-0 tabular-nums', numCls)}>{cv(r.cripto)}</span>
        </>
      ) : (
        <span className="text-gray-400">…</span>
      )}
    </>
  );

  if (toolbar) {
    return (
      <div
        className="min-w-0 w-full max-w-full"
        title="Cotizaciones USD (DolarHoy / DolarApi). Clima y hora local. Referencia, no fiscal."
        aria-live="polite"
      >
        {/* Bloque alineado a la derecha; el scroll horizontal empieza por USD (izquierda del contenido), sin recortar inicio/fin */}
        <div className="flex w-full min-w-0 justify-end">
          <div className="min-w-0 max-w-full overflow-x-auto overflow-y-visible py-0.5 [scrollbar-width:thin] [scroll-padding-inline:10px]">
            <div className="flex w-max max-w-none flex-nowrap items-center gap-x-2 px-2 text-[11px] leading-snug">
              <div className="flex shrink-0 items-center gap-x-1.5 whitespace-nowrap">
                {ratesBlock}
              </div>
              {hint && r ? (
                <span
                  className="shrink-0 whitespace-nowrap text-[10px] text-gray-400"
                  title="Última actualización de la fuente de cotizaciones"
                >
                  Act. {hint}
                </span>
              ) : null}
              <span className={dotCls} aria-hidden>
                ·
              </span>
              <DashboardLocalWeatherClock compact />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mb-3 border-y border-gray-100 bg-white px-2 py-1.5 text-[11px] leading-snug text-gray-500"
      title="Cotizaciones USD (compra/venta en $). Misma referencia que DolarHoy vía DolarApi; no reemplaza cotizaciones BCRA para fines fiscales."
      aria-live="polite"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-2 sm:gap-y-0.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 sm:gap-x-2">{ratesBlock}</div>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-2 gap-y-1">
          {hint && r ? (
            <span
              className="shrink-0 text-[10px] text-gray-400"
              title="Última actualización entre las cotizaciones de la fuente"
            >
              Act. {hint}
            </span>
          ) : null}
          <DashboardLocalWeatherClock />
        </div>
      </div>
    </div>
  );
}

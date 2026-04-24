import { NextResponse } from 'next/server';

/**
 * Cotizaciones USD en ARS alineadas a lo que publica DolarHoy.com.
 * Fuente: https://dolarapi.com/v1/dolares (API comunitaria que consolida la misma referencia de mercado).
 */
type DolarApiRow = {
  casa: string;
  nombre?: string;
  compra: number;
  venta: number;
  fechaActualizacion?: string;
};

type ArsUsdPair = { compra: number | null; venta: number | null };

function pick(rows: DolarApiRow[], casa: string): ArsUsdPair {
  const r = rows.find((x) => x.casa === casa);
  if (!r) return { compra: null, venta: null };
  const c = typeof r.compra === 'number' && !Number.isNaN(r.compra) ? r.compra : null;
  const v = typeof r.venta === 'number' && !Number.isNaN(r.venta) ? r.venta : null;
  return { compra: c, venta: v };
}

function maxIso(dates: (string | undefined)[]): string | null {
  const parsed = dates
    .filter(Boolean)
    .map((s) => ({ s: s!, t: Date.parse(s!) }))
    .filter((x) => !Number.isNaN(x.t));
  if (parsed.length === 0) return null;
  parsed.sort((a, b) => b.t - a.t);
  return parsed[0].s;
}

export async function GET() {
  try {
    const res = await fetch('https://dolarapi.com/v1/dolares', {
      next: { revalidate: 180 },
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: 'upstream', status: res.status },
        { status: 502, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    const rows = (await res.json()) as DolarApiRow[];
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'empty' }, { status: 502 });
    }

    const oficial = pick(rows, 'oficial');
    const blue = pick(rows, 'blue');
    const bolsa = pick(rows, 'bolsa');
    const contadoconliqui = pick(rows, 'contadoconliqui');
    const tarjeta = pick(rows, 'tarjeta');
    const cripto = pick(rows, 'cripto');

    const lastUpdate = maxIso(
      rows.map((r) => r.fechaActualizacion).filter(Boolean) as string[]
    );

    return NextResponse.json(
      {
        source: 'DolarApi (referencia DolarHoy)',
        lastUpdate,
        rates: {
          oficial,
          blue,
          bolsa,
          contadoconliqui,
          tarjeta,
          cripto,
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=360',
        },
      }
    );
  } catch {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 502 });
  }
}

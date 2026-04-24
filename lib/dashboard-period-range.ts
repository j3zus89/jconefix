/**
 * Rangos ISO [from, to] alineados con el Resumen del panel (`app/dashboard/page.tsx` → `periodRange`).
 * Sirve para KPIs de ingresos que deben coincidir entre pantallas.
 */
export type ReportsIncomePeriod = 'week' | 'month' | 'year';

export function reportsIncomePeriodIsoRange(period: ReportsIncomePeriod): { from: string; to: string } {
  const now = new Date();
  const pad = (d: Date) => d.toISOString();
  const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const endOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  };

  if (period === 'week') {
    const s = startOfDay(new Date(now));
    s.setDate(s.getDate() - 6);
    return { from: pad(s), to: pad(endOfDay(now)) };
  }
  if (period === 'year') {
    const s = new Date(now.getFullYear(), 0, 1);
    s.setHours(0, 0, 0, 0);
    return { from: pad(s), to: pad(endOfDay(now)) };
  }
  const s = new Date(now.getFullYear(), now.getMonth(), 1);
  s.setHours(0, 0, 0, 0);
  return { from: pad(s), to: pad(endOfDay(now)) };
}

/** Igual que el período «ÚLTIMOS 30» del Resumen del panel (30 días calendario hasta hoy). */
export function last30DaysIsoRange(): { from: string; to: string } {
  const now = new Date();
  const pad = (d: Date) => d.toISOString();
  const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const endOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  };
  const s = startOfDay(new Date(now));
  s.setDate(s.getDate() - 29);
  return { from: pad(s), to: pad(endOfDay(now)) };
}

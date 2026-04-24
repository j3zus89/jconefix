/**
 * Respuesta de la RPC `get_pos_sales_dashboard_aggregates` (migración 202604141100).
 */

export type PosSalesDailyAggregateRow = {
  sale_day: string;
  venta: number;
  descuento: number;
  neto: number;
  impuesto: number;
};

export type PosSalesPaymentAggregateRow = {
  payment_method: string;
  total_amount: number;
};

export type PosSalesPeriodTotals = {
  pos_total: number;
  discount_total: number;
  neto_total: number;
  tax_total: number;
  sale_count: number;
};

export type PosSalesDashboardAggregates = {
  daily: PosSalesDailyAggregateRow[];
  by_payment: PosSalesPaymentAggregateRow[];
  period: PosSalesPeriodTotals;
};

function num(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === 'object' && !Array.isArray(x);
}

/** Parsea el jsonb devuelto por PostgREST; devuelve null si la forma no es válida. */
export function parsePosSalesDashboardAggregates(data: unknown): PosSalesDashboardAggregates | null {
  if (!isRecord(data)) return null;

  const dailyRaw = data.daily;
  const payRaw = data.by_payment;
  const periodRaw = data.period;

  if (!Array.isArray(dailyRaw) || !Array.isArray(payRaw) || !isRecord(periodRaw)) return null;

  const daily: PosSalesDailyAggregateRow[] = dailyRaw.map((row) => {
    if (!isRecord(row)) {
      return { sale_day: '', venta: 0, descuento: 0, neto: 0, impuesto: 0 };
    }
    return {
      sale_day: typeof row.sale_day === 'string' ? row.sale_day : String(row.sale_day ?? ''),
      venta: num(row.venta),
      descuento: num(row.descuento),
      neto: num(row.neto),
      impuesto: num(row.impuesto),
    };
  });

  const by_payment: PosSalesPaymentAggregateRow[] = payRaw.map((row) => {
    if (!isRecord(row)) {
      return { payment_method: 'cash', total_amount: 0 };
    }
    return {
      payment_method:
        typeof row.payment_method === 'string'
          ? row.payment_method
          : String(row.payment_method ?? 'cash'),
      total_amount: num(row.total_amount),
    };
  });

  const period: PosSalesPeriodTotals = {
    pos_total: num(periodRaw.pos_total),
    discount_total: num(periodRaw.discount_total),
    neto_total: num(periodRaw.neto_total),
    tax_total: num(periodRaw.tax_total),
    sale_count: Math.round(num(periodRaw.sale_count)),
  };

  return { daily, by_payment, period };
}

/** Respuesta de `get_dashboard_repair_payments_by_method` (jsonb array). */
export function parseRepairPaymentsByMethodJson(data: unknown): PosSalesPaymentAggregateRow[] {
  if (!Array.isArray(data)) return [];
  return data.map((row) => {
    if (!isRecord(row)) {
      return { payment_method: 'cash', total_amount: 0 };
    }
    return {
      payment_method:
        typeof row.payment_method === 'string'
          ? row.payment_method
          : String(row.payment_method ?? 'cash'),
      total_amount: num(row.total_amount),
    };
  });
}

/** Une filas POS y reparaciones por clave de método (minúsculas); orden por importe descendente. */
export type RepairDailyVentaRow = {
  sale_day: string;
  venta: number;
};

/** Respuesta de `get_dashboard_repair_payments_daily` (jsonb array). */
export function parseRepairDailyVentaJson(data: unknown): RepairDailyVentaRow[] {
  if (!Array.isArray(data)) return [];
  return data.map((row) => {
    if (!isRecord(row)) {
      return { sale_day: '', venta: 0 };
    }
    return {
      sale_day: typeof row.sale_day === 'string' ? row.sale_day : String(row.sale_day ?? ''),
      venta: num(row.venta),
    };
  });
}

/**
 * Suma la serie diaria de reparaciones a la del POS (misma clave sale_day ISO).
 * El importe de reparación suma a venta y neto; descuento e impuesto del POS se mantienen.
 */
export function mergePosDailyWithRepairDaily(
  pos: PosSalesDailyAggregateRow[],
  repair: RepairDailyVentaRow[]
): PosSalesDailyAggregateRow[] {
  const map = new Map<string, PosSalesDailyAggregateRow>();
  for (const d of pos) {
    if (!d.sale_day) continue;
    map.set(d.sale_day, { ...d });
  }
  for (const r of repair) {
    if (!r.sale_day || r.venta <= 0) continue;
    const cur = map.get(r.sale_day);
    if (cur) {
      cur.venta += r.venta;
      cur.neto += r.venta;
    } else {
      map.set(r.sale_day, {
        sale_day: r.sale_day,
        venta: r.venta,
        descuento: 0,
        neto: r.venta,
        impuesto: 0,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.sale_day.localeCompare(b.sale_day));
}

export function mergePaymentMethodTotals(
  pos: PosSalesPaymentAggregateRow[],
  repair: PosSalesPaymentAggregateRow[]
): PosSalesPaymentAggregateRow[] {
  const m = new Map<string, number>();
  const add = (rows: PosSalesPaymentAggregateRow[]) => {
    for (const r of rows) {
      const k = (r.payment_method || 'cash').trim().toLowerCase();
      m.set(k, (m.get(k) ?? 0) + r.total_amount);
    }
  };
  add(pos);
  add(repair);
  return Array.from(m.entries())
    .map(([payment_method, total_amount]) => ({ payment_method, total_amount }))
    .filter((x) => x.total_amount > 0)
    .sort((a, b) => b.total_amount - a.total_amount);
}

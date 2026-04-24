import { adminFetch } from '@/lib/auth/adminFetch';
import { canonicalizeColumnMapping, type ColumnMapping } from '@/lib/smart-import/apply-mapping';
import { CUSTOMER_TARGET_FIELDS } from '@/lib/smart-import/constants';
import type { TargetFieldId } from '@/lib/smart-import/constants';

export type CustomersExcelSmartImportResult =
  | {
      ok: true;
      summary: {
        customersCreated: number;
        customersReused: number;
        ticketsCreated: number;
        rowsProcessed: number;
        distinctCustomersInImport: number;
        rowErrors: { rowIndex: number; message: string }[];
      };
      blankRowsSkipped: number;
      rowsWithData: number;
    }
  | { ok: false; message: string };

/**
 * Importa clientes desde .xlsx/.xls usando el mismo flujo que Ajustes → Importar desde Excel
 * (solo clientes): lectura robusta de celdas, sugerencia por cabeceras + datos, deduplicación en commit.
 */
export async function runCustomersExcelSmartImport(file: File): Promise<CustomersExcelSmartImportResult> {
  const fd = new FormData();
  fd.set('file', file);
  fd.set('mode', 'customers_only');

  const analyzeRes = await adminFetch('/api/dashboard/smart-import/analyze', { method: 'POST', body: fd });
  const analyzeJson = (await analyzeRes.json()) as {
    error?: string;
    headers?: string[];
    rows?: string[][];
    suggestedMapping?: Record<string, string | null>;
    rowCount?: number;
    blankRowsSkipped?: number;
  };

  if (!analyzeRes.ok) {
    return { ok: false, message: analyzeJson.error || 'No se pudo analizar el archivo.' };
  }

  const headers = analyzeJson.headers ?? [];
  const rows = analyzeJson.rows ?? [];
  const blankRowsSkipped = analyzeJson.blankRowsSkipped ?? 0;
  const rowsWithData = analyzeJson.rowCount ?? rows.length;

  if (!headers.length || !rows.length) {
    return { ok: false, message: 'No hay datos importables en la primera hoja (revisá cabeceras y filas).' };
  }

  const mappingObj: ColumnMapping = {};
  for (const [k, v] of Object.entries(analyzeJson.suggestedMapping || {})) {
    mappingObj[k as TargetFieldId] = v;
  }
  const canon = canonicalizeColumnMapping(headers, mappingObj);
  const mapping: Record<string, string | null> = {};
  for (const f of CUSTOMER_TARGET_FIELDS) {
    const v = canon[f.id];
    mapping[f.id] = v && String(v).trim() ? v : null;
  }

  const body = { mode: 'customers_only' as const, headers, rows, mapping };

  const previewRes = await adminFetch('/api/dashboard/smart-import/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const previewJson = (await previewRes.json()) as {
    error?: string;
    totals?: { errors: number };
    preview?: { ok: boolean; errors: string[]; rowIndex: number }[];
  };

  if (!previewRes.ok) {
    return { ok: false, message: previewJson.error || 'Error al validar el archivo.' };
  }

  const errCount = previewJson.totals?.errors ?? 0;
  if (errCount > 0) {
    const bad = previewJson.preview?.find((p) => !p.ok);
    const detail = bad?.errors?.[0] ?? 'Revisá nombres obligatorios y columnas.';
    return {
      ok: false,
      message: `${errCount} fila${errCount === 1 ? '' : 's'} con error: ${detail} Podés afinar el mapeo en Ajustes → Importar desde Excel.`,
    };
  }

  const commitRes = await adminFetch('/api/dashboard/smart-import/commit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const commitJson = (await commitRes.json()) as {
    error?: string;
    summary?: {
      customersCreated: number;
      customersReused: number;
      ticketsCreated: number;
      rowsProcessed?: number;
      distinctCustomersInImport?: number;
      rowErrors?: { rowIndex: number; message: string }[];
    };
  };

  if (!commitRes.ok) {
    return { ok: false, message: commitJson.error || 'No se pudo completar la importación.' };
  }

  const summary = commitJson.summary;
  if (!summary) {
    return { ok: false, message: 'Respuesta incompleta del servidor.' };
  }

  return {
    ok: true,
    summary: {
      customersCreated: summary.customersCreated,
      customersReused: summary.customersReused,
      ticketsCreated: summary.ticketsCreated,
      rowsProcessed: summary.rowsProcessed ?? rows.length,
      distinctCustomersInImport: summary.distinctCustomersInImport ?? summary.rowsProcessed ?? rows.length,
      rowErrors: summary.rowErrors ?? [],
    },
    blankRowsSkipped,
    rowsWithData,
  };
}

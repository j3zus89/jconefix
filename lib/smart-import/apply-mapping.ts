import type { TargetFieldId } from '@/lib/smart-import/constants';
import { normalizeHeaderKey } from '@/lib/smart-import/normalize';

export type ColumnMapping = Partial<Record<TargetFieldId, string | null>>;

/** Índice de columna: coincidencia exacta, luego trim, luego cabecera normalizada (NFC, sin tildes). */
export function resolveHeaderColumnIndex(headers: string[], sourceHeader: string): number | undefined {
  const want = sourceHeader.trim();
  if (!want) return undefined;
  const synthetic = /^__jc_col_(\d+)$/i.exec(want);
  if (synthetic) {
    const i = Number(synthetic[1]);
    if (Number.isInteger(i) && i >= 0 && i < headers.length && headers[i] === want) {
      return i;
    }
  }
  for (let i = 0; i < headers.length; i++) {
    if (headers[i] === sourceHeader) return i;
  }
  for (let i = 0; i < headers.length; i++) {
    if (headers[i].trim() === want) return i;
  }
  const nWant = normalizeHeaderKey(want);
  if (!nWant) return undefined;
  for (let i = 0; i < headers.length; i++) {
    if (normalizeHeaderKey(headers[i]) === nWant) return i;
  }
  return undefined;
}

/**
 * Alinea cada valor del mapeo con la cadena exacta en `headers[i]`.
 * Evita fallos donde `headers.includes(v)` falla por Unicode (NFC vs NFD) y el cliente envía `customer_phone: null`
 * aunque la columna exista y `resolveHeaderColumnIndex` sí la resuelva.
 */
export function canonicalizeColumnMapping(headers: string[], mapping: ColumnMapping): ColumnMapping {
  const out: ColumnMapping = { ...mapping };
  for (const key of Object.keys(out)) {
    const v = out[key as TargetFieldId];
    if (v == null) continue;
    if (typeof v !== 'string' || !v.trim()) {
      out[key as TargetFieldId] = null;
      continue;
    }
    const idx = resolveHeaderColumnIndex(headers, v);
    out[key as TargetFieldId] = idx === undefined ? null : headers[idx]!;
  }
  return out;
}

/** Convierte una fila del Excel en valores por campo destino usando cabeceras del archivo. */
export function rowToMappedFields(
  headers: string[],
  row: string[],
  mapping: ColumnMapping
): Record<TargetFieldId, string> {
  const out = {} as Record<TargetFieldId, string>;
  for (const [target, sourceHeader] of Object.entries(mapping) as [TargetFieldId, string | null | undefined][]) {
    if (!sourceHeader) continue;
    const i = resolveHeaderColumnIndex(headers, sourceHeader);
    if (i === undefined || i >= row.length) continue;
    const cell = row[i] ?? '';
    out[target] = typeof cell === 'string' ? cell.trim() : String(cell).trim();
  }
  return out;
}

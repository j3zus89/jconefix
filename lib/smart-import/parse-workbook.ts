import * as XLSX from 'xlsx';
import { SMART_IMPORT_MAX_ROWS } from '@/lib/smart-import/constants';

function cellToString(cell: XLSX.CellObject | undefined): string {
  if (!cell) return '';
  const v = cell.v;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  // Teléfonos y formatos personalizados: Excel guarda el valor en `v` (número) pero el texto
  // visible (+34 …, guiones) suele estar en `w`. Si solo usamos `v`, se pierde el prefijo y a veces la lectura.
  let w = cell.w != null ? String(cell.w).trim() : '';
  if (w === '' && v != null && cell.t !== 'z' && cell.t !== 'e') {
    try {
      const formatted = XLSX.utils.format_cell(cell);
      if (formatted != null && String(formatted).trim() !== '') {
        w = String(formatted).trim();
      }
    } catch {
      /* ignorar */
    }
  }
  if (w !== '') return w;
  if (v == null) return '';
  // Evitar notación científica en enteros grandes típicos de teléfono (p. ej. 1.15E+10)
  if (typeof v === 'number' && Number.isFinite(v) && Math.abs(v) >= 1e7 && Math.abs(v) < 1e15) {
    const asInt = Math.round(v);
    if (Math.abs(asInt - v) < 1e-6) return String(asInt);
  }
  return String(v).trim();
}

/**
 * Primera hoja del libro → cabeceras (fila 1) y filas de datos.
 * Recorta a `SMART_IMPORT_MAX_ROWS` filas de datos.
 */
export function parseFirstSheetToGrid(buffer: ArrayBuffer): {
  headers: string[];
  rows: string[][];
  truncated: boolean;
  sheetName: string;
  /** Filas en el rango de la hoja que no tenían ninguna celda con texto (se omiten). */
  blankRowsSkipped: number;
  /** Filas físicas entre la cabecera y el final del rango (incluye las vacías). */
  physicalDataRowsInRange: number;
} {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true, cellNF: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    return {
      headers: [],
      rows: [],
      truncated: false,
      sheetName: '',
      blankRowsSkipped: 0,
      physicalDataRowsInRange: 0,
    };
  }
  const sheet = wb.Sheets[sheetName];
  const range = sheet['!ref'] ? XLSX.utils.decode_range(sheet['!ref']) : null;
  if (!range) {
    return {
      headers: [],
      rows: [],
      truncated: false,
      sheetName,
      blankRowsSkipped: 0,
      physicalDataRowsInRange: 0,
    };
  }

  const maxCol = range.e.c;
  const headerRowIndex = range.s.r;

  // Una entrada por columna física (mismo ancho que cada fila de datos). Antes se hacía `pop` de
  // cabeceras vacías al final → headers más cortos que las filas → el mapeo apuntaba al índice
  // equivocado y columnas como Teléfono quedaban siempre vacías al importar.
  const headers: string[] = [];
  const seenHeaderText = new Map<string, number>();
  for (let c = range.s.c; c <= maxCol; c++) {
    const colIndex = c - range.s.c;
    const addr = XLSX.utils.encode_cell({ r: headerRowIndex, c });
    const raw = cellToString(sheet[addr] as XLSX.CellObject).trim().normalize('NFC');
    let key: string;
    if (!raw) {
      key = `__jc_col_${colIndex}`;
    } else {
      const n = (seenHeaderText.get(raw) ?? 0) + 1;
      seenHeaderText.set(raw, n);
      key = n === 1 ? raw : `${raw} (${n})`;
    }
    headers.push(key);
  }

  const dataStart = headerRowIndex + 1;
  const totalDataRows = Math.max(0, range.e.r - headerRowIndex);
  const truncated = totalDataRows > SMART_IMPORT_MAX_ROWS;
  const lastRow = truncated ? dataStart + SMART_IMPORT_MAX_ROWS - 1 : range.e.r;

  const physicalDataRowsInRange = Math.max(0, lastRow - dataStart + 1);
  const rows: string[][] = [];
  let blankRowsSkipped = 0;
  for (let r = dataStart; r <= lastRow; r++) {
    const row: string[] = [];
    let any = false;
    for (let c = range.s.c; c <= maxCol; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const val = cellToString(sheet[addr] as XLSX.CellObject);
      row.push(val);
      if (val) any = true;
    }
    if (any) rows.push(row);
    else blankRowsSkipped++;
  }

  return { headers, rows, truncated, sheetName, blankRowsSkipped, physicalDataRowsInRange };
}

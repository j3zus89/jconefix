/**
 * CSV de clientes: exportación e importación con cabeceras en español o inglés.
 */

import { mapHeadersToSchema } from '@/lib/smart-import-mapper';
import { CUSTOMER_SCHEMA } from '@/lib/import-schemas';

export type CustomerCsvInsert = {
  name: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  organization: string | null;
  customer_group: string;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  notes: string | null;
  id_type: string | null;
  id_number: string | null;
  mailchimp_status: string;
  gdpr_consent: boolean;
};

/** Cabeceras del CSV exportado (reimportables). */
export const CUSTOMER_CSV_EXPORT_HEADERS = [
  'name',
  'first_name',
  'last_name',
  'email',
  'phone',
  'organization',
  'customer_group',
  'address',
  'city',
  'state',
  'postal_code',
  'country',
  'notes',
  'id_type',
  'id_number',
  'mailchimp_status',
  'gdpr_consent',
] as const;

const HEADER_LABEL_ES: Record<(typeof CUSTOMER_CSV_EXPORT_HEADERS)[number], string> = {
  name: 'Nombre completo',
  first_name: 'Nombre',
  last_name: 'Apellidos',
  email: 'Correo electrónico',
  phone: 'Teléfono móvil',
  organization: 'Organización',
  customer_group: 'Grupo de clientes',
  address: 'Dirección',
  city: 'Ciudad',
  state: 'Provincia',
  postal_code: 'Código postal',
  country: 'País',
  notes: 'Notas',
  id_type: 'Tipo de documento',
  id_number: 'Número de documento',
  mailchimp_status: 'MailChimp',
  gdpr_consent: 'RGPD conforme',
};

/** Cabecera legible para Excel (primera fila del export). */
export function customerCsvSpanishHeaders(): string[] {
  return CUSTOMER_CSV_EXPORT_HEADERS.map((k) => HEADER_LABEL_ES[k]);
}

/** Caracteres que obligan a entrecomillar la celda. */
export function escapeCsvCell(v: string): string {
  const s = String(v ?? '');
  if (/[",\n\r;\t]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Separador para Excel en España/UE: `;` (la `,` es el separador decimal). */
export const CUSTOMER_CSV_EXCEL_DELIMITER = ';' as const;

/** Une celdas ya escapadas con el separador indicado. */
export function joinCsvRow(cells: string[], delimiter: ',' | ';' = ','): string {
  return cells.join(delimiter);
}

/**
 * Construye un Blob CSV con BOM UTF-8 correcto para que Excel lo abra
 * sin garbled characters (Ã³ → ó, Ã© → é, etc.).
 *
 * Escribe el BOM como bytes exactos (0xEF 0xBB 0xBF) usando TextEncoder,
 * evitando el bug de '\uFEFF' como string JavaScript cuando `sep=` está
 * en la primera línea y Excel ignora la señal de codificación.
 */
export function buildCsvBlob(
  lines: string[],
  delimiter: ',' | ';' = CUSTOMER_CSV_EXCEL_DELIMITER
): Blob {
  // Línea de ayuda para Excel EU: indica el separador sin depender del locale
  const hint = delimiter === ';' ? 'sep=;\r\n' : '';
  const csvText = hint + lines.join('\r\n');
  const encoder = new TextEncoder(); // siempre UTF-8
  const BOM = new Uint8Array([0xef, 0xbb, 0xbf]); // BOM bytes exactos
  const encoded = encoder.encode(csvText);
  return new Blob([BOM, encoded], { type: 'text/csv;charset=utf-8;' });
}

function normHeader(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

/** alias normalizado → campo interno */
const ALIAS_TO_FIELD = new Map<string, keyof CustomerCsvInsert | 'skip'>([
  ['name', 'name'],
  ['nombre', 'name'],
  ['nombre completo', 'name'],
  ['nombre del cliente', 'name'],
  ['nombre de cliente', 'name'],
  ['nombre y apellidos', 'name'],
  ['nombre contacto', 'name'],
  ['contacto', 'name'],
  ['titular', 'name'],
  ['customer name', 'name'],
  ['display name', 'name'],
  ['fullname', 'name'],
  ['first_name', 'first_name'],
  ['nombre pila', 'first_name'],
  ['last_name', 'last_name'],
  ['apellidos', 'last_name'],
  ['apellido', 'last_name'],
  ['email', 'email'],
  ['correo', 'email'],
  ['correo electronico', 'email'],
  ['e-mail', 'email'],
  ['phone', 'phone'],
  ['telefono', 'phone'],
  ['telefono movil', 'phone'],
  ['movil', 'phone'],
  ['organization', 'organization'],
  ['organizacion', 'organization'],
  ['empresa', 'organization'],
  ['razon social', 'organization'],
  ['nombre comercial', 'organization'],
  ['nombre fantasia', 'organization'],
  ['nombre empresa', 'organization'],
  ['customer_group', 'customer_group'],
  ['grupo', 'customer_group'],
  ['grupo de clientes', 'customer_group'],
  ['address', 'address'],
  ['direccion', 'address'],
  ['city', 'city'],
  ['ciudad', 'city'],
  ['state', 'state'],
  ['provincia', 'state'],
  ['estado', 'state'],
  ['postal_code', 'postal_code'],
  ['codigo postal', 'postal_code'],
  ['cp', 'postal_code'],
  ['country', 'country'],
  ['pais', 'country'],
  ['notes', 'notes'],
  ['notas', 'notes'],
  ['id_type', 'id_type'],
  ['tipo de documento', 'id_type'],
  ['tipo documento', 'id_type'],
  ['id_number', 'id_number'],
  ['numero de documento', 'id_number'],
  ['documento', 'id_number'],
  ['nif', 'id_number'],
  ['cuit', 'id_number'],
  ['mailchimp_status', 'mailchimp_status'],
  ['mailchimp', 'mailchimp_status'],
  ['gdpr_consent', 'gdpr_consent'],
  ['rgpd', 'gdpr_consent'],
  ['rgpd conforme', 'gdpr_consent'],
  ['gdpr', 'gdpr_consent'],
  // ignorar columnas de solo lectura del export enriquecido
  ['id', 'skip'],
  ['entradas', 'skip'],
  ['monto de boletos', 'skip'],
  ['monto de tickets', 'skip'],
  ['amount receivable', 'skip'],
]);

function detectDelimiter(line: string): ',' | ';' {
  let inQ = false;
  let commas = 0;
  let semis = 0;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        i++;
        continue;
      }
      inQ = !inQ;
    } else if (!inQ) {
      if (c === ',') commas++;
      if (c === ';') semis++;
    }
  }
  return semis > commas ? ';' : ',';
}

/** Divide una línea respetando comillas. */
export function parseDelimitedLine(line: string, delim: ',' | ';'): string[] {
  const out: string[] = [];
  let field = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQ = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') inQ = true;
      else if (c === delim) {
        out.push(field.trim());
        field = '';
      } else if (c === '\r') continue;
      else field += c;
    }
  }
  out.push(field.trim());
  return out;
}

/** Excel a veces guarda `sep=;` en la primera línea; la ignoramos al importar. */
function stripExcelSepHint(rawLines: string[]): string[] {
  if (rawLines.length === 0) return rawLines;
  const first = rawLines[0]!.trim();
  if (/^sep\s*=/i.test(first)) return rawLines.slice(1);
  return rawLines;
}

export function parseCustomerCsvText(text: string): { headers: string[]; rows: string[][] } {
  let t = text;
  if (t.charCodeAt(0) === 0xfeff) t = t.slice(1);
  const rawLines = t.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const lines = stripExcelSepHint(rawLines);
  if (lines.length === 0) return { headers: [], rows: [] };
  const delim = detectDelimiter(lines[0]!);
  const headers = parseDelimitedLine(lines[0]!, delim);
  const rows = lines.slice(1).map((ln) => parseDelimitedLine(ln, delim));
  return { headers, rows };
}

function parseBool(v: string): boolean {
  const s = normHeader(v);
  return s === 'true' || s === '1' || s === 'si' || s === 'sí' || s === 'yes' || s === 'conforme';
}

const CUSTOMER_IMPORT_FIELD_KEYS = new Set<string>([...CUSTOMER_CSV_EXPORT_HEADERS]);

/**
 * Mapea headers de cualquier Excel/CSV al schema de clientes usando el motor ETL inteligente.
 * Soporta exportaciones de Google Contacts, iPhone, Shopify, Odoo, HubSpot, etc.
 *
 * @param headers   Cabeceras tal como vienen del archivo.
 * @param dataRows  Filas de datos (para type inference). Puede ser [].
 */
export function buildCustomerFieldMapping(
  headers: string[],
  dataRows: unknown[][] = []
): Map<number, keyof CustomerCsvInsert> {
  const results = mapHeadersToSchema(headers, dataRows, CUSTOMER_SCHEMA);
  const m = new Map<number, keyof CustomerCsvInsert>();

  for (const r of results) {
    if (!r.best || r.best.confidence === 'none') continue;
    const field = r.best.field;
    if (CUSTOMER_IMPORT_FIELD_KEYS.has(field)) {
      m.set(r.colIndex, field as keyof CustomerCsvInsert);
    }
  }

  // Fallback: alias legado para campos que el motor nuevo no haya detectado
  headers.forEach((raw, i) => {
    if (m.has(i)) return; // ya detectado por el motor
    const n = normHeader(raw);
    const legacyField = ALIAS_TO_FIELD.get(n);
    if (legacyField && legacyField !== 'skip' && CUSTOMER_IMPORT_FIELD_KEYS.has(legacyField)) {
      m.set(i, legacyField as keyof CustomerCsvInsert);
    }
  });

  return m;
}

function scoreCustomerHeaderMapping(fieldByIndex: Map<number, keyof CustomerCsvInsert>): number {
  if (fieldByIndex.size === 0) return 0;
  const fld = new Set(fieldByIndex.values());
  let s = fieldByIndex.size * 2;
  if (fld.has('name')) s += 6;
  if (fld.has('first_name') || fld.has('last_name')) s += 2;
  if (fld.has('organization')) s += 4;
  if (fld.has('email')) s += 2;
  if (fld.has('phone')) s += 2;
  return s;
}

/**
 * Detecta la fila de cabeceras en hojas con filas vacías o de instrucciones encima.
 * Usa el motor ETL inteligente para puntuar cada fila candidata.
 */
export function findBestCustomerHeaderRowIndex(jsonData: unknown[][], maxScan = 25): number {
  let bestIdx = 0;
  let bestScore = -1;
  const limit = Math.min(maxScan, jsonData.length);
  for (let r = 0; r < limit; r++) {
    const row = jsonData[r];
    if (!Array.isArray(row) || row.length === 0) continue;
    const hdrs = row.map((h) => String(h ?? '').trim());
    // Pasar las filas siguientes como muestra de datos para type inference
    const sampleData = jsonData.slice(r + 1, r + 6) as unknown[][];
    const map = buildCustomerFieldMapping(hdrs, sampleData);
    const score = scoreCustomerHeaderMapping(map);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = r;
    }
  }
  return bestIdx;
}

function cellLooksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function cellLooksLikePhone(s: string): boolean {
  const d = s.replace(/\D/g, '');
  return d.length >= 8 && /^[+\d\s().-]+$/.test(s);
}

/**
 * Si no hay nombre/apellidos/organización reconocidos, toma el texto más largo
 * de columnas sin mapear (útil con exportaciones raras de CRM).
 */
export function fillMissingCustomerFieldsFromRow(
  raw: Record<string, string>,
  cells: string[],
  fieldByIndex: Map<number, keyof CustomerCsvInsert>
): Record<string, string> {
  const first = (raw.first_name || '').trim();
  const last = (raw.last_name || '').trim();
  const org = (raw.organization || '').trim();
  const name = (raw.name || '').trim();
  const composed = [first, last].filter(Boolean).join(' ').trim();
  if (name || composed || org) return raw;

  let best = '';
  for (let i = 0; i < cells.length; i++) {
    if (fieldByIndex.has(i)) continue;
    const s = (cells[i] || '').trim();
    if (s.length < 2 || s.length > 200) continue;
    if (cellLooksLikeEmail(s)) continue;
    if (cellLooksLikePhone(s)) continue;
    if (/^(si|sí|no|true|false|0|1)$/i.test(s)) continue;
    if (/^[$€£]?\s*[\d.,]+\s*$/.test(s)) continue;
    if (/^\d+([.,]\d+)?$/.test(s)) continue;
    if (s.length > best.length) best = s;
  }
  if (!best) return raw;
  return { ...raw, name: best };
}

export function csvRowToCustomerPayload(
  cells: string[],
  fieldByIndex: Map<number, keyof CustomerCsvInsert>
): Record<string, string> {
  const o: Record<string, string> = {};
  fieldByIndex.forEach((field, idx) => {
    const v = cells[idx]?.trim() ?? '';
    if (!v) return;
    const prev = o[field];
    if (!prev) {
      o[field] = v;
      return;
    }
    if (field === 'name' || field === 'organization' || field === 'notes') {
      if (v.length > prev.length) o[field] = v;
    }
  });
  return o;
}

export function payloadToInsert(
  raw: Record<string, string>
): { ok: true; data: CustomerCsvInsert } | { ok: false; error: string } {
  const first = (raw.first_name || '').trim();
  const last = (raw.last_name || '').trim();
  const org = (raw.organization || '').trim();
  let name = (raw.name || '').trim();
  if (!name) name = [first, last].filter(Boolean).join(' ').trim();
  if (!name) name = org;
  if (!name) return { ok: false, error: 'Falta nombre (Nombre completo, Nombre+Apellidos u Organización).' };

  const gdpr = raw.gdpr_consent != null && raw.gdpr_consent !== '' ? parseBool(String(raw.gdpr_consent)) : false;
  const mc = (raw.mailchimp_status || '').trim() || 'No suscrito';
  const group = (raw.customer_group || '').trim() || 'Particular';

  return {
    ok: true,
    data: {
      name,
      first_name: first || null,
      last_name: last || null,
      email: (raw.email || '').trim() || null,
      phone: (raw.phone || '').trim() || null,
      organization: org || null,
      customer_group: group,
      address: (raw.address || '').trim() || null,
      city: (raw.city || '').trim() || null,
      state: (raw.state || '').trim() || null,
      postal_code: (raw.postal_code || '').trim() || null,
      country: (raw.country || '').trim() || null,
      notes: (raw.notes || '').trim() || null,
      id_type: (raw.id_type || '').trim() || null,
      id_number: (raw.id_number || '').trim() || null,
      mailchimp_status: mc,
      gdpr_consent: gdpr,
    },
  };
}

export function buildExportRow(
  c: Record<string, unknown>,
  keys: readonly (typeof CUSTOMER_CSV_EXPORT_HEADERS)[number][] = CUSTOMER_CSV_EXPORT_HEADERS
): string[] {
  return keys.map((k) => {
    const v = c[k];
    if (k === 'gdpr_consent') return v === true || v === 'true' ? 'Sí' : 'No';
    if (v == null) return '';
    return String(v);
  });
}

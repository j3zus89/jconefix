/**
 * Utilidad compartida para exportar archivos XLSX profesionales con exceljs.
 * Aplica estilos: encabezados en mayúsculas + negrita + fondo gris,
 * anchos automáticos, formato moneda y fechas legibles.
 *
 * USO (client-side):
 *   import { buildXlsx } from '@/lib/excel-export';
 *   const buffer = await buildXlsx({ sheetName, columns, rows });
 *   downloadBuffer(buffer, 'nombre-archivo.xlsx');
 */

export type XlsxColumn = {
  /** Nombre visible en la cabecera (se sube a MAYÚSCULAS automáticamente). */
  header: string;
  /** Propiedad del objeto fila. */
  key: string;
  /** Tipo de celda para dar formato. */
  type?: 'text' | 'number' | 'currency' | 'date' | 'percent';
  /** Símbolo de moneda (€, $, etc.) cuando type = 'currency'. */
  currencySymbol?: string;
  /** Ancho mínimo en caracteres (opcional; si no, se calcula automáticamente). */
  minWidth?: number;
};

export type XlsxBuildOptions = {
  sheetName: string;
  columns: XlsxColumn[];
  rows: Record<string, unknown>[];
  /** Ej: 'JC ONE FIX — Tickets' para la propiedad title del libro. */
  title?: string;
  currencySymbol?: string;
};

/** Descarga un ArrayBuffer como archivo .xlsx en el navegador. */
export function downloadXlsx(buffer: ArrayBuffer, filename: string): void {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Formatea una fecha como DD/MM/YYYY HH:mm (sin dependencias). */
export function fmtDate(value: unknown): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

/**
 * Genera el buffer XLSX.
 * Carga exceljs dinámicamente (solo en el cliente) para evitar
 * que el servidor de Next.js intente importar módulos nativos de Node.
 */
export async function buildXlsx(opts: XlsxBuildOptions): Promise<ArrayBuffer> {
  // Importación dinámica: exceljs usa módulos Node solo en runtime cliente
  const ExcelJS = (await import('exceljs')).default;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'JC ONE FIX';
  wb.created = new Date();
  if (opts.title) wb.title = opts.title;

  const ws = wb.addWorksheet(opts.sheetName, {
    views: [{ state: 'frozen', ySplit: 1 }], // congela la fila de encabezados
  });

  // ── Definir columnas ───────────────────────────────────────────────
  ws.columns = opts.columns.map((col) => ({
    header: col.header.toUpperCase(),
    key: col.key,
    width: col.minWidth ?? 14,
  }));

  // ── Estilo de encabezados ──────────────────────────────────────────
  const headerRow = ws.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FF333333' }, size: 11 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' }, // gris azulado claro
    };
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FF94A3B8' } },
    };
  });
  headerRow.height = 20;

  // ── Añadir filas de datos ──────────────────────────────────────────
  for (const row of opts.rows) {
    const dataRow = ws.addRow(
      opts.columns.reduce<Record<string, unknown>>((acc, col) => {
        const raw = row[col.key];
        if (col.type === 'date') {
          acc[col.key] = fmtDate(raw);
        } else if (col.type === 'currency') {
          const num = parseFloat(String(raw ?? 0));
          acc[col.key] = Number.isNaN(num) ? '' : num;
        } else if (col.type === 'number' || col.type === 'percent') {
          const num = parseFloat(String(raw ?? 0));
          acc[col.key] = Number.isNaN(num) ? '' : num;
        } else {
          acc[col.key] = raw != null ? String(raw) : '';
        }
        return acc;
      }, {})
    );

    // Estilos de celda por tipo
    dataRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
      const col = opts.columns[colNum - 1];
      if (!col) return;

      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
      cell.font = { size: 10, color: { argb: 'FF1E293B' } };

      if (col.type === 'currency') {
        const sym = col.currencySymbol ?? opts.currencySymbol ?? '€';
        cell.numFmt = `"${sym}"#,##0.00`;
        cell.alignment = { ...cell.alignment, horizontal: 'right' };
      } else if (col.type === 'number') {
        cell.numFmt = '#,##0';
        cell.alignment = { ...cell.alignment, horizontal: 'right' };
      } else if (col.type === 'percent') {
        cell.numFmt = '0.00%';
        cell.alignment = { ...cell.alignment, horizontal: 'right' };
      }
    });
  }

  // ── Zebra striping (filas alternas levemente grises) ──────────────
  ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
    if (rowNum <= 1) return;
    if (rowNum % 2 === 0) {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' },
        };
      });
    }
  });

  // ── Auto-ajuste de ancho por contenido ───────────────────────────
  ws.columns.forEach((col, i) => {
    const def = opts.columns[i];
    let maxLen = (def?.header ?? '').length + 2;
    ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
      if (rowNum === 1) return;
      const cell = row.getCell(i + 1);
      const val = cell.text ?? String(cell.value ?? '');
      if (val.length > maxLen) maxLen = val.length;
    });
    col.width = Math.min(Math.max(maxLen + 2, def?.minWidth ?? 12), 60);
  });

  const buffer = await wb.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

/**
 * Normaliza un encabezado para el smart-mapping de importación.
 * Quita tildes, convierte a minúsculas y elimina espacios extra.
 */
export function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/[-_/]+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Smart-mapping de columnas de importación.
 * Dado un array de aliases por campo, devuelve el campo que
 * mejor coincide con un encabezado del archivo importado.
 *
 * Ejemplo:
 *   IMPORT_FIELD_ALIASES.phone = ['telefono', 'phone', 'movil', 'cel', 'celular']
 */
export const IMPORT_FIELD_ALIASES: Record<string, string[]> = {
  // ── Clientes
  name: [
    'nombre del cliente',
    'nombre de cliente',
    'nombre completo',
    'nombre y apellidos',
    'nombre contacto',
    'contacto',
    'titular',
    'cliente',
    'customer name',
    'nombre',
    'name',
    'fullname',
    'customer',
    'display name',
  ],
  first_name:   ['nombre', 'first name', 'first_name', 'nombre pila'],
  last_name:    ['apellidos', 'apellido', 'last name', 'last_name', 'surname'],
  email:        ['email', 'correo', 'correo electronico', 'e-mail', 'mail'],
  phone:        ['telefono', 'telefono movil', 'phone', 'movil', 'cel', 'celular', 'mobile', 'tel'],
  organization: [
    'razon social',
    'denominacion social',
    'organizacion',
    'empresa',
    'organization',
    'company',
    'negocio',
    'nombre empresa',
    'company name',
    'nombre comercial',
    'nombre fantasia',
    'denominacion',
  ],
  customer_group: ['grupo', 'grupo de clientes', 'group', 'customer group', 'tipo cliente'],
  address:      ['direccion', 'address', 'domicilio', 'calle'],
  city:         ['ciudad', 'city', 'localidad', 'poblacion'],
  state:        ['provincia', 'estado', 'state', 'region', 'comunidad'],
  postal_code:  ['codigo postal', 'zip', 'cp', 'postal code', 'postcode'],
  country:      ['pais', 'country', 'nacion'],
  notes:        ['notas', 'notes', 'observaciones', 'comentarios', 'comments'],
  id_type:      ['tipo documento', 'id type', 'tipo de documento', 'documento tipo'],
  id_number:    ['numero documento', 'nif', 'dni', 'cuit', 'rut', 'id number', 'documento'],
  gdpr_consent: ['rgpd', 'gdpr', 'rgpd conforme', 'gdpr consent', 'consentimiento'],
  mailchimp_status: ['mailchimp', 'mailchimp status', 'newsletter'],

  // ── Inventario (exportaciones tipo Square / retail suelen usar "Item Name", "Minimum Price", etc.)
  'inv.name': [
    'item name',
    'product name',
    'inventory name',
    'nombre',
    'nombre repuesto',
    'nombre articulo',
    'nombre del articulo',
    'denominacion',
    'articulo',
    'producto',
    'name',
    'item', // solo exactitud; evita falsos positivos con includes
  ],
  'inv.sku': [
    'multiple supplier skus',
    'supplier skus',
    'name code',
    'name/code',
    'codigo interno',
    'internal id',
    'product id',
    'sku',
    'codigo',
    'referencia',
    'ref',
    'code',
    'item id',
    'itemid',
  ],
  'inv.upc': [
    'sku upc',
    'skuupc',
    'sku/upc',
    'upc',
    'barcode',
    'ean',
    'codigo barras',
    'codigo de barras',
  ],
  'inv.category': ['categoria', 'category', 'tipo', 'tipo producto'],
  'inv.brand': ['marca', 'brand', 'fabricante', 'manufacturer'],
  'inv.model': ['modelo', 'model', 'model number', 'model no', 'numero modelo'],
  'inv.quantity': [
    'quantity on hand',
    'qty on hand',
    'on hand qty',
    'current quantity',
    'cantidad',
    'quantity',
    'qty',
    'existencias',
  ],
  'inv.stock_warning': [
    'stock warning',
    'advertencia stock',
    'low stock alert',
    'min stock level',
    'punto de pedido',
  ],
  'inv.reorder_level': ['reorder level', 'reorder point', 'nivel reorden', 'punto de reorden', 'reorder'],
  'inv.price': [
    'minimum price',
    'sale price',
    'default price',
    'list price',
    'precio',
    'price',
    'pvp',
    'precio venta',
    'venta',
  ],
  'inv.unit_cost': [
    'new inventory item cost',
    'inventory item cost',
    'standard cost',
    'average cost',
    'unit cost',
    'costo',
    'coste',
    'cost',
    'precio compra',
    'precio proveedor',
    'compra',
  ],
  'inv.supplier': ['proveedor', 'supplier', 'vendor', 'distribuidor'],
  'inv.condition': ['condicion', 'condition', 'estado', 'grado'],
  'inv.description': [
    'long description',
    'full description',
    'descripcion',
    'description',
    'notas',
    'observaciones',
  ],
};

const MAX_HEADER_CELL_CHARS = 72;

function filterAliasEntries(namespace: '' | 'inv.' = '') {
  return Object.entries(IMPORT_FIELD_ALIASES).filter(([field]) => {
    if (namespace && !field.startsWith(namespace)) return false;
    if (!namespace && field.startsWith('inv.')) return false;
    return true;
  });
}

/**
 * Coincidencia con nivel de confianza (3=exacta, 2=subcadena larga, 1=palabra).
 * Sirve para elegir la mejor columna cuando hay varias candidatas al mismo campo.
 */
export function matchInventoryColumn(
  rawHeader: string,
  namespace: '' | 'inv.' = ''
): { field: string; tier: number } | null {
  const norm = normalizeHeader(rawHeader);
  if (!norm) return null;
  const entries = filterAliasEntries(namespace);
  const aliasNorm = (a: string) => normalizeHeader(a);

  for (const [field, aliases] of entries) {
    const fieldBase = namespace ? field.slice(namespace.length) : field;
    if (aliases.some((a) => aliasNorm(a) === norm)) {
      return { field: fieldBase, tier: 3 };
    }
  }

  for (const [field, aliases] of entries) {
    const fieldBase = namespace ? field.slice(namespace.length) : field;
    const longOnes = aliases.map(aliasNorm).filter((an) => an.length >= 10);
    if (longOnes.some((an) => norm.includes(an))) {
      return { field: fieldBase, tier: 2 };
    }
  }

  for (const [field, aliases] of entries) {
    const fieldBase = namespace ? field.slice(namespace.length) : field;
    for (const a of aliases) {
      const an = aliasNorm(a);
      if (an.length < 5 || an.length >= 10) continue;
      const escaped = an.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(^|\\s)${escaped}(\\s|$)`);
      if (re.test(norm)) {
        return { field: fieldBase, tier: 1 };
      }
    }
  }

  return null;
}

/**
 * Mapeo sugerido: por campo, la mejor columna (mayor tier; si empate, la más a la izquierda).
 */
export function suggestInventoryColumnMapping(headerRow: string[]): Record<string, string> {
  const best = new Map<string, { header: string; tier: number; col: number }>();

  headerRow.forEach((raw, colIndex) => {
    const trimmed = raw == null ? '' : String(raw).trim();
    if (!trimmed) return;
    const m = matchInventoryColumn(trimmed, 'inv.');
    if (!m) return;
    const prev = best.get(m.field);
    if (!prev || m.tier > prev.tier || (m.tier === prev.tier && colIndex < prev.col)) {
      best.set(m.field, { header: trimmed, tier: m.tier, col: colIndex });
    }
  });

  return Object.fromEntries(Array.from(best.entries()).map(([k, v]) => [k, v.header]));
}

/**
 * Muchas exportaciones (Square, VIAMOVIL, etc.) ponen filas de instrucciones antes de los títulos.
 * Solo puntuamos celdas cortas (típico encabezado); párrafos largos ya no inflan el score.
 */
export function findInventoryHeaderRowIndex(
  jsonData: unknown[][],
  opts?: { maxScan?: number; minScore?: number }
): number {
  const maxScan = Math.min(opts?.maxScan ?? 40, jsonData.length);
  const minScore = opts?.minScore ?? 2;
  let bestIdx = 0;
  let bestScore = -1;
  for (let r = 0; r < maxScan; r++) {
    const row = jsonData[r];
    if (!Array.isArray(row) || row.length === 0) continue;
    let score = 0;
    for (const cell of row) {
      if (cell == null) continue;
      const s = String(cell).trim();
      if (s.length === 0 || s.length > MAX_HEADER_CELL_CHARS) continue;
      if (matchInventoryColumn(s, 'inv.')) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestIdx = r;
    }
  }
  return bestScore >= minScore ? bestIdx : 0;
}

/** Plantillas (p. ej. Square) suelen poner una fila de ayuda en inglés justo debajo de los títulos. */
const INSTRUCTION_ROW_EN_RE =
  /do not edit|kindly leave|this column will include|enter the (desired )?serial|enter the item id in this column|categorize your items|always use a > separator|for example:\s*dell/i;
const INSTRUCTION_ROW_ES_RE =
  /no edite (los )?valores|deje (la celda|este campo) vacío|esta columna incluye|introduzca el id del artículo|número de serie deseado|use (siempre )?el separador >/i;

/**
 * Fila de instrucciones del proveedor (textos largos en varias columnas), no un repuesto.
 */
export function isLikelyInventoryInstructionRow(
  row: unknown[],
  columnCount: number
): boolean {
  if (!Array.isArray(row) || row.length === 0) return false;
  const n = Math.max(columnCount, row.length, 1);
  const LONG = 100;
  let longCells = 0;
  let nonEmpty = 0;
  for (let c = 0; c < n; c++) {
    const cell = row[c];
    if (cell == null || String(cell).trim() === '') continue;
    nonEmpty++;
    const s = String(cell).trim();
    if (INSTRUCTION_ROW_EN_RE.test(s) || INSTRUCTION_ROW_ES_RE.test(s)) return true;
    if (s.length > LONG) longCells++;
  }
  if (nonEmpty === 0) return false;
  const threshold = Math.max(3, Math.ceil(nonEmpty * 0.35));
  return longCells >= threshold;
}

/**
 * Detecta automáticamente el campo de BD correspondiente a un encabezado importado.
 * @param rawHeader  Encabezado tal como viene en el archivo del usuario.
 * @param namespace  Prefijo opcional para filtrar aliases ('inv.' para inventario).
 * @returns El campo de BD o null si no hay coincidencia.
 */
export function detectFieldFromHeader(
  rawHeader: string,
  namespace: '' | 'inv.' = ''
): string | null {
  return matchInventoryColumn(rawHeader, namespace)?.field ?? null;
}

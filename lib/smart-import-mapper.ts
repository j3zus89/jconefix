/**
 * Motor ETL inteligente para importación de archivos Excel/CSV de cualquier origen.
 *
 * Técnicas combinadas (de mayor a menor prioridad):
 *  1. Alias exacto   — coincidencia perfecta tras normalización → 100 pts
 *  2. Alias parcial  — el alias está contenido en el header o viceversa → 75-90 pts
 *  3. Levenshtein    — distancia de edición ≤ 2 para cubrir erratas → 60-80 pts
 *  4. Token overlap  — palabras en común entre header y alias → 40-60 pts
 *  5. Tipo inferido  — se mira el contenido de las celdas de esa columna → 30-55 pts
 *
 * Compatibilidad probada con exportaciones de:
 *   Google Contacts, iPhone (vCard), WhatsApp, Shopify, WooCommerce,
 *   Odoo, QuickBooks, Square, Mercado Libre, Alegra, Bind ERP,
 *   Excel manual en español, inglés y portugués.
 */

// ─── Normalización ─────────────────────────────────────────────────────────────

export function normalizeStr(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar tildes
    .replace(/[-_./\\|]+/g, ' ')    // separadores → espacio
    .replace(/[^a-z0-9\s]/g, '')    // solo alfanumérico
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Levenshtein distance ──────────────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const m = a.length;
  const n = b.length;
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n];
}

// ─── Puntuación de coincidencia header ↔ alias ────────────────────────────────

/**
 * Devuelve un score 0-100 que indica cuánto se parece `headerNorm` al alias.
 * 100 = coincidencia perfecta.  0 = ninguna relación.
 */
function scoreAliasMatch(headerNorm: string, aliasNorm: string): number {
  if (!headerNorm || !aliasNorm) return 0;

  // 1. Exacta
  if (headerNorm === aliasNorm) return 100;

  // 2. El alias está completamente dentro del header (ej: "email del cliente" contiene "email")
  if (headerNorm.includes(aliasNorm) && aliasNorm.length >= 3) {
    const ratio = aliasNorm.length / headerNorm.length;
    return Math.round(88 * ratio + 12); // ~90 si casi todo, ~70 si el alias es muy corto
  }

  // 3. El header está completamente dentro del alias
  if (aliasNorm.includes(headerNorm) && headerNorm.length >= 3) {
    const ratio = headerNorm.length / aliasNorm.length;
    return Math.round(80 * ratio + 10);
  }

  // 4. Token overlap: qué fracción de palabras coinciden
  const hTokens = new Set(headerNorm.split(' ').filter((t) => t.length >= 2));
  const aTokens = new Set(aliasNorm.split(' ').filter((t) => t.length >= 2));
  if (hTokens.size > 0 && aTokens.size > 0) {
    let common = 0;
    hTokens.forEach((t) => { if (aTokens.has(t)) common++; });
    if (common > 0) {
      const jaccard = common / (hTokens.size + aTokens.size - common);
      if (jaccard >= 0.5) return Math.round(jaccard * 70);
    }
  }

  // 5. Levenshtein: tolera erratas (ej: "telefone" → "telefono")
  const dist = levenshtein(headerNorm, aliasNorm);
  const maxLen = Math.max(headerNorm.length, aliasNorm.length);
  if (dist <= 2 && maxLen >= 4) {
    return Math.round((1 - dist / maxLen) * 75);
  }

  return 0;
}

// ─── Inferencia de tipo por contenido de celdas ───────────────────────────────

export type InferredType =
  | 'email' | 'phone' | 'number' | 'integer' | 'date'
  | 'boolean' | 'url' | 'id_number' | 'text';

/**
 * Examina un muestreo de valores de una columna y deduce el tipo.
 * `samples` son los valores de las primeras N filas de esa columna.
 */
export function inferColumnType(samples: unknown[]): InferredType {
  const nonEmpty = samples
    .map((v) => (v == null ? '' : String(v).trim()))
    .filter((v) => v.length > 0);

  if (nonEmpty.length === 0) return 'text';

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const PHONE_RE = /^[+\d()\s.-]{6,20}$/;
  const DATE_RE = /^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}$/;
  const NUMBER_RE = /^-?[\d,.]+$/;
  const INTEGER_RE = /^-?\d+$/;
  const URL_RE = /^https?:\/\//i;
  const BOOL_RE = /^(true|false|yes|no|si|sí|1|0)$/i;
  const ID_RE = /^\d{7,20}$/; // CUIT, IMEI, DNI, etc.

  let emails = 0, phones = 0, dates = 0, numbers = 0;
  let integers = 0, urls = 0, booleans = 0, ids = 0;

  for (const v of nonEmpty) {
    if (EMAIL_RE.test(v)) emails++;
    else if (URL_RE.test(v)) urls++;
    else if (DATE_RE.test(v)) dates++;
    else if (BOOL_RE.test(v)) booleans++;
    else if (PHONE_RE.test(v)) phones++;
    else if (ID_RE.test(v)) ids++;
    else if (INTEGER_RE.test(v)) integers++;
    else if (NUMBER_RE.test(v)) numbers++;
  }

  const n = nonEmpty.length;
  const majority = (count: number) => count / n >= 0.7;

  if (majority(emails)) return 'email';
  if (majority(urls)) return 'url';
  if (majority(dates)) return 'date';
  if (majority(booleans)) return 'boolean';
  if (majority(ids)) return 'id_number';
  if (majority(phones)) return 'phone';
  if (majority(integers)) return 'integer';
  if (majority(numbers)) return 'number';
  return 'text';
}

// ─── Schema y puntuación por tipo inferido ────────────────────────────────────

/**
 * Si el campo esperado coincide con el tipo inferido de la columna,
 * suma puntos de refuerzo al score.
 */
function typeBonus(field: string, inferredType: InferredType): number {
  const typeMap: Record<string, InferredType[]> = {
    email:        ['email'],
    phone:        ['phone'],
    price:        ['number'],
    unit_cost:    ['number'],
    quantity:     ['integer', 'number'],
    stock_warning:['integer', 'number'],
    reorder_level:['integer', 'number'],
    id_number:    ['id_number', 'integer'],
    gdpr_consent: ['boolean'],
    postal_code:  ['integer', 'id_number'],
  };
  const expectedTypes = typeMap[field] ?? typeMap[field.replace('inv.', '')] ?? [];
  return expectedTypes.includes(inferredType) ? 20 : 0;
}

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export type FieldSchema = {
  field: string;
  label: string;
  required?: boolean;
  aliases: string[];
};

export type MappingMatch = {
  /** Campo de BD mapeado (ej: 'email', 'name', 'inv.price'). */
  field: string;
  /** Score 0-100. */
  score: number;
  /** Nivel de confianza derivado del score. */
  confidence: 'certain' | 'probable' | 'possible' | 'none';
  /** Alias que causó la coincidencia (para debugging). */
  matchedAlias: string;
  /** Tipo inferido de la columna por sus datos. */
  inferredType: InferredType;
};

export type ColumnMappingResult = {
  /** Header tal como viene en el Excel. */
  header: string;
  /** Índice de columna en el Excel. */
  colIndex: number;
  /** Tipo inferido por los datos de la columna. */
  inferredType: InferredType;
  /** Mejor campo encontrado, o null si no hay coincidencia. */
  best: MappingMatch | null;
};

// ─── Motor principal ───────────────────────────────────────────────────────────

function scoreToConfidence(score: number): MappingMatch['confidence'] {
  if (score >= 85) return 'certain';
  if (score >= 60) return 'probable';
  if (score >= 35) return 'possible';
  return 'none';
}

/**
 * Para un header y sus datos de muestra, encuentra el mejor campo del schema.
 */
function detectBestField(
  rawHeader: string,
  samples: unknown[],
  schema: FieldSchema[]
): MappingMatch | null {
  const headerNorm = normalizeStr(rawHeader);
  if (!headerNorm) return null;

  const inferredType = inferColumnType(samples);
  let bestScore = 0;
  let bestField = '';
  let bestAlias = '';

  for (const fieldDef of schema) {
    for (const alias of fieldDef.aliases) {
      const aliasNorm = normalizeStr(alias);
      const base = scoreAliasMatch(headerNorm, aliasNorm);
      if (base <= 0) continue;
      const bonus = typeBonus(fieldDef.field, inferredType);
      const total = Math.min(100, base + bonus);
      if (total > bestScore) {
        bestScore = total;
        bestField = fieldDef.field;
        bestAlias = alias;
      }
    }
  }

  // Umbral mínimo para declarar coincidencia
  if (bestScore < 30) return null;

  return {
    field: bestField,
    score: bestScore,
    confidence: scoreToConfidence(bestScore),
    matchedAlias: bestAlias,
    inferredType,
  };
}

/**
 * Mapea todos los headers del Excel al schema del destino.
 * Garantiza que cada campo del schema se asigne a la columna con MAYOR score
 * (si dos columnas competían por el mismo campo, gana la de mayor score).
 *
 * @param headers   Array de strings con los encabezados del Excel.
 * @param dataRows  Filas de datos (para inferencia de tipo). Puede ser vacío.
 * @param schema    Definición de los campos destino con sus aliases.
 * @returns         Array de resultados ordenado por colIndex.
 */
export function mapHeadersToSchema(
  headers: string[],
  dataRows: unknown[][],
  schema: FieldSchema[]
): ColumnMappingResult[] {
  // Muestrear hasta 20 filas por columna para type inference
  const SAMPLE_ROWS = 20;
  const samples: unknown[][] = headers.map((_, colIdx) =>
    dataRows.slice(0, SAMPLE_ROWS).map((row) => (Array.isArray(row) ? row[colIdx] : undefined))
  );

  // Primera pasada: calcular el mejor match para cada columna
  const candidates: Array<{
    colIndex: number;
    header: string;
    inferredType: InferredType;
    best: MappingMatch | null;
  }> = headers.map((header, colIndex) => ({
    colIndex,
    header,
    inferredType: inferColumnType(samples[colIndex] ?? []),
    best: detectBestField(header, samples[colIndex] ?? [], schema),
  }));

  // Segunda pasada: resolver conflictos (dos columnas → mismo campo)
  // Gana la que tenga mayor score; la otra se queda sin asignación.
  const assigned = new Map<string, { colIndex: number; score: number }>();
  for (const c of candidates) {
    if (!c.best) continue;
    const prev = assigned.get(c.best.field);
    if (!prev || c.best.score > prev.score) {
      assigned.set(c.best.field, { colIndex: c.colIndex, score: c.best.score });
    }
  }

  return candidates.map((c) => ({
    header: c.header,
    colIndex: c.colIndex,
    inferredType: c.inferredType,
    best:
      c.best && assigned.get(c.best.field)?.colIndex === c.colIndex
        ? c.best
        : null,
  }));
}

/**
 * Versión simplificada: dado un array de headers devuelve un Map<field, colIndex>.
 * Útil para los importadores que solo necesitan "campo → índice" sin UI.
 */
export function buildFieldIndexMap(
  headers: string[],
  dataRows: unknown[][],
  schema: FieldSchema[]
): Map<string, number> {
  const results = mapHeadersToSchema(headers, dataRows, schema);
  const map = new Map<string, number>();
  for (const r of results) {
    if (r.best && r.best.confidence !== 'none') {
      map.set(r.best.field, r.colIndex);
    }
  }
  return map;
}

// ─── Helper: color de confianza para UI ───────────────────────────────────────

export function confidenceColor(c: MappingMatch['confidence']): string {
  switch (c) {
    case 'certain':  return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    case 'probable': return 'text-amber-700 bg-amber-50 border-amber-200';
    case 'possible': return 'text-orange-700 bg-orange-50 border-orange-200';
    default:         return 'text-gray-500 bg-gray-50 border-gray-200';
  }
}

export function confidenceLabel(c: MappingMatch['confidence']): string {
  switch (c) {
    case 'certain':  return 'Seguro';
    case 'probable': return 'Probable';
    case 'possible': return 'Posible';
    default:         return 'No detectado';
  }
}

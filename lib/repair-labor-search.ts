/**
 * Búsqueda en servicios de reparación: sinónimos y tildes frecuentes en español
 * (el catálogo usa nombres con tilde; el usuario a veces escribe sin ella).
 */

const WILDCARD_MODEL_SNIPPET = 'Todos los modelos';

/** Valor de modelo del tarifario importado (aplica a cualquier modelo de esa marca). */
export const REPAIR_LABOR_MODEL_WILDCARD = `(Todos los modelos)`;

/**
 * Variantes de palabra clave para OR en ilike (Postgres distingue acentos en ilike).
 */
export function expandLaborKeywordFragments(keyword: string): string[] {
  const k = keyword.trim().replace(/%/g, '').replace(/_/g, '');
  if (!k) return [];
  const out = new Set<string>([k]);
  const low = k.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');

  if (low.includes('bater')) {
    out.add('batería');
    out.add('bateria');
  }
  if (low.includes('pantall')) out.add('pantalla');
  if (low.includes('micro') || low.includes('micr')) out.add('micrófono');
  if (low.includes('liquido') || low.includes('liquid')) {
    out.add('líquido');
    out.add('liquido');
  }
  if (low.includes('diagnost')) out.add('diagnóstico');
  if (low.includes('camara') || low.includes('cámara')) {
    out.add('cámara');
    out.add('camara');
  }
  if (low.includes('teclado')) out.add('teclado');
  if (low.includes('placa')) out.add('placa');
  if (low.includes('puerto') || low.includes('carga')) out.add('carga');

  return Array.from(out).filter(Boolean);
}

export function laborModelFilterOrPattern(modelFragment: string): string {
  const m = modelFragment.trim().replace(/%/g, '').replace(/_/g, '');
  if (!m) return '';
  return `model.ilike.%${m}%,model.ilike.%${WILDCARD_MODEL_SNIPPET}%`;
}

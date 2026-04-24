import type { LaborCountryCode } from '@/lib/repair-labor-tariffs-2026';

export function sanitizeLaborIlikeFragment(s: string): string {
  return s.trim().replace(/%/g, '').replace(/_/g, '');
}

export type IntakeLaborServicePick = {
  id: string;
  service_name: string;
  price: number;
  model?: string | null;
};

const INTAKE_BUDGET_MARKER = '── Presupuesto en recepción ──';

function stripIntakeBudgetBlock(text: string): string {
  const idx = text.indexOf(INTAKE_BUDGET_MARKER);
  if (idx === -1) return text.trimEnd();
  return text.slice(0, idx).trimEnd();
}

/** Parseo del importe en recepción / ticket (coma decimal permitida). */
export function parseMoneyInput(raw: string): number | null {
  const n = parseFloat(String(raw).replace(',', '.'));
  if (!Number.isFinite(n) || raw.trim() === '') return null;
  return n;
}

/** Añade o actualiza el bloque de servicio/precio en recepción (notas de diagnóstico). */
export function mergeEquipmentLaborDiagnostic(
  existing: string | null | undefined,
  labor: IntakeLaborServicePick | null,
  priceInput: string,
  currencySymbol: string
): string | null {
  const base = stripIntakeBudgetBlock((existing || '').trim());
  if (!labor) return base || null;

  const edited = parseMoneyInput(priceInput);
  const amount = edited ?? labor.price;
  const block = `\n${INTAKE_BUDGET_MARKER}\nServicio (tarifario): ${labor.service_name} · ${currencySymbol}${amount.toFixed(2)}`;
  return base ? `${base}\n${block.trim()}` : block.trim();
}

export function laborCountryFromOrgLocale(_isAR?: boolean): LaborCountryCode {
  return 'AR';
}

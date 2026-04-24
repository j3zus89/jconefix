/** Límite mensual de «Pulir con IA» por organización (`organizations.settings.polish_ai_monthly_limit`). */
export function readPolishMonthlyLimitFromOrgSettings(settings: unknown): number | null {
  if (!settings || typeof settings !== 'object') return null;
  const raw = (settings as Record<string, unknown>).polish_ai_monthly_limit;
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return Math.floor(raw);
  if (typeof raw === 'string' && /^\d+$/.test(raw.trim())) {
    const n = parseInt(raw.trim(), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

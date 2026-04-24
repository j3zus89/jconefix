/**
 * Normaliza el nombre de organización/taller para mostrar en la UI.
 * Los datos legacy en Supabase pueden seguir con el sufijo " - Original";
 * hasta ejecutar la migración, esto evita mostrar esa parte en el panel.
 */
export function displayOrgOrShopName(name: string | null | undefined, fallback = 'Mi Taller'): string {
  const s = (name ?? '').trim();
  if (!s) return fallback;
  const cleaned = s.replace(/\s*-\s*Original\s*$/i, '').trim();
  return cleaned || fallback;
}

/**
 * PostgREST a veces devuelve errores genéricos al leer `admin_organization_stats`
 * (p. ej. "Could not query the database for the schema cache. Retrying.") sin citar el nombre de la vista.
 * En ese caso debemos leer `organizations` con service_role.
 */
export function shouldReadOrganizationsTableInsteadOfStatsView(errorMessage: string | undefined | null): boolean {
  const m = String(errorMessage || '').toLowerCase();
  if (!m) return false;
  if (m.includes('schema cache')) return true;
  if (m.includes('could not query the database')) return true;
  if (
    m.includes('admin_organization_stats') &&
    (m.includes('does not exist') ||
      m.includes('relation') ||
      m.includes('permission denied') ||
      m.includes('schema cache'))
  ) {
    return true;
  }
  return false;
}

/** Respuesta de POST /api/admin/users/generate-link (org o usuario). */
export function extractMagicLinkActionUrl(json: {
  action_link?: string | null;
  data?: { properties?: { action_link?: string | null } } | null;
}): string | null {
  const top = typeof json.action_link === 'string' && json.action_link.trim() ? json.action_link.trim() : null;
  if (top) return top;
  const nested = json.data?.properties?.action_link;
  if (typeof nested === 'string' && nested.trim()) return nested.trim();
  return null;
}

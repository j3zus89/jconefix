import type { SupabaseClient } from '@supabase/supabase-js';

/** Evento al guardar o quitar el logo en Ajustes (cabecera del chat interno, etc.). */
export const SHOP_LOGO_UPDATED_EVENT = 'jc-shop-logo-updated';

export function notifyShopLogoUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SHOP_LOGO_UPDATED_EVENT));
  }
}

/**
 * Logo del taller para UI (chat interno, etc.): organización → shop_settings por org → shop_settings del usuario.
 */
export async function resolveOrgChatLogoUrl(
  supabase: SupabaseClient,
  organizationId: string | null
): Promise<string | null> {
  if (!organizationId) return null;

  const { data: orgRow } = await supabase
    .from('organizations')
    .select('logo_url')
    .eq('id', organizationId)
    .maybeSingle();
  const orgLogo = (orgRow as { logo_url?: string | null } | null)?.logo_url?.trim();
  if (orgLogo) return orgLogo;

  const { data: shopByOrg } = await (supabase as any)
    .from('shop_settings')
    .select('logo_url')
    .eq('organization_id', organizationId)
    .maybeSingle();
  const logo1 = shopByOrg?.logo_url?.trim();
  if (logo1) return logo1;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: shopUser } = await (supabase as any)
    .from('shop_settings')
    .select('logo_url')
    .eq('user_id', user.id)
    .maybeSingle();
  const logo2 = shopUser?.logo_url?.trim();
  return logo2 || null;
}

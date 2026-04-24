import type { SupabaseClient } from '@supabase/supabase-js';
import { displayOrgOrShopName } from '@/lib/display-name';

const cacheKey = (organizationId: string) => `jcof_shop_name_${organizationId}`;

/**
 * Nombre del taller / organización para la UI (misma prioridad que la barra superior del panel).
 * Devuelve null si no hay datos; actualiza localStorage con la clave por organización.
 */
export async function resolveShopDisplayName(
  supabase: SupabaseClient,
  organizationId: string
): Promise<string | null> {
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(cacheKey(organizationId));
      if (cached?.trim()) return displayOrgOrShopName(cached);
    } catch {
      /* ignore */
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: memberData } = await supabase
    .from('organization_members')
    .select('organizations!inner(name)')
    .eq('user_id', user.id)
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .maybeSingle();

  if (memberData?.organizations) {
    const org = memberData.organizations as { name?: string };
    if (org?.name?.trim()) {
      const name = displayOrgOrShopName(org.name);
      try {
        if (typeof window !== 'undefined') localStorage.setItem(cacheKey(organizationId), name);
      } catch {
        /* ignore */
      }
      return name;
    }
  }

  const { data: shopRow } = await (supabase as any)
    .from('shop_settings')
    .select('shop_name')
    .eq('user_id', user.id)
    .maybeSingle();
  if (shopRow?.shop_name?.trim()) {
    const name = displayOrgOrShopName(shopRow.shop_name);
    try {
      if (typeof window !== 'undefined') localStorage.setItem(cacheKey(organizationId), name);
    } catch {
      /* ignore */
    }
    return name;
  }

  return null;
}

import type { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

/** Clave en `user.user_metadata` (sync con servidor; sirve en APK WebView donde localStorage falla). */
export const JC_PANEL_PUESTA_EN_MARCHA_DONE = 'jc_panel_puesta_en_marcha_done' as const;

export function isPanelPuestaEnMarchaDoneInMetadata(user: User | null | undefined): boolean {
  if (!user?.user_metadata) return false;
  return user.user_metadata[JC_PANEL_PUESTA_EN_MARCHA_DONE] === true;
}

/**
 * Marca en Supabase que el usuario ya vio / cerró «Puesta en marcha».
 * Idempotente; fusiona con metadata existente (full_name, etc.).
 */
export async function persistPanelPuestaEnMarchaDone(
  supabase: SupabaseClient,
  user: User
): Promise<{ ok: boolean }> {
  if (user.user_metadata?.[JC_PANEL_PUESTA_EN_MARCHA_DONE] === true) {
    return { ok: true };
  }
  const { error } = await supabase.auth.updateUser({
    data: {
      ...(user.user_metadata && typeof user.user_metadata === 'object' ? user.user_metadata : {}),
      [JC_PANEL_PUESTA_EN_MARCHA_DONE]: true,
    },
  });
  if (error) {
    console.warn('[onboarding] No se pudo guardar en la cuenta:', error.message);
    return { ok: false };
  }
  return { ok: true };
}

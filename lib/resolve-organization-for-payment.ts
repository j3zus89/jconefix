import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';

function looksLikeRlsOrWrongServiceKey(err: PostgrestError | null | undefined): boolean {
  const m = (err?.message || '').toLowerCase();
  if (!m) return false;
  if (m.includes('at least one policy') && m.includes('unauthorized')) return true;
  if (m.includes('policy') && m.includes('unauthorized')) return true;
  return false;
}

export type ResolveOrganizationForPaymentResult =
  | { ok: true; organizationId: string; ownerId: string }
  | { ok: false; reason: 'not_found' | 'db_policy_or_key' };

/**
 * Resuelve organización activa y titular usando service role (sin RLS).
 * Solo llamar tras validar `userId` con la sesión del servidor.
 * Replica la lógica de get_user_organization_id + comprobación de pago.
 */
export async function resolveOrganizationForMercadoPago(
  admin: SupabaseClient,
  userId: string
): Promise<ResolveOrganizationForPaymentResult> {
  const { data: memRows, error: memErr } = await admin
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('joined_at', { ascending: true })
    .limit(1);

  if (memErr) {
    console.error('[resolve-org] organization_members:', memErr.message, memErr.code);
    if (looksLikeRlsOrWrongServiceKey(memErr)) return { ok: false, reason: 'db_policy_or_key' };
    return { ok: false, reason: 'not_found' };
  }

  let organizationId: string | null =
    (memRows?.[0] as { organization_id?: string } | undefined)?.organization_id ?? null;

  if (!organizationId) {
    const { data: owned, error: ownErr } = await admin
      .from('organizations')
      .select('id')
      .eq('owner_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (ownErr) {
      console.error('[resolve-org] organizations (owner):', ownErr.message, ownErr.code);
      if (looksLikeRlsOrWrongServiceKey(ownErr)) return { ok: false, reason: 'db_policy_or_key' };
      return { ok: false, reason: 'not_found' };
    }
    organizationId = owned?.id ?? null;
  }

  if (!organizationId) return { ok: false, reason: 'not_found' };

  const { data: orgRow, error: orgErr } = await admin
    .from('organizations')
    .select('owner_id')
    .eq('id', organizationId)
    .maybeSingle();

  if (orgErr) {
    console.error('[resolve-org] organizations (owner_id):', orgErr.message, orgErr.code);
    if (looksLikeRlsOrWrongServiceKey(orgErr)) return { ok: false, reason: 'db_policy_or_key' };
    return { ok: false, reason: 'not_found' };
  }

  const ownerId = orgRow?.owner_id?.trim() || '';
  if (!ownerId) return { ok: false, reason: 'not_found' };

  const { data: mem, error: checkErr } = await admin
    .from('organization_members')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (checkErr) {
    console.error('[resolve-org] member check:', checkErr.message, checkErr.code);
    if (looksLikeRlsOrWrongServiceKey(checkErr)) return { ok: false, reason: 'db_policy_or_key' };
    return { ok: false, reason: 'not_found' };
  }

  if (!mem && ownerId !== userId) {
    return { ok: false, reason: 'not_found' };
  }

  return { ok: true, organizationId, ownerId };
}

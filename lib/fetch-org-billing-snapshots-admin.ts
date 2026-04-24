import type { SupabaseClient } from '@supabase/supabase-js';
import type { OrgBillingSnapshot } from '@/lib/billing-expiry-warning';

type MemberRow = {
  organization_id?: string;
  organizations: OrgBillingSnapshot;
};

type OwnedRow = OrgBillingSnapshot & { id?: string };

/** Miembros activos + organizaciones de las que el usuario es dueño (misma lógica que el middleware del panel). */
export async function fetchOrgBillingSnapshotsForUser(
  admin: SupabaseClient,
  userId: string
): Promise<OrgBillingSnapshot[]> {
  const { data: memberRows } = await admin
    .from('organization_members')
    .select(
      'organization_id, organizations!inner(subscription_status, trial_ends_at, license_expires_at, license_unlimited)'
    )
    .eq('user_id', userId)
    .eq('is_active', true);

  const { data: ownedRows } = await admin
    .from('organizations')
    .select('id, subscription_status, trial_ends_at, license_expires_at, license_unlimited')
    .eq('owner_id', userId)
    .is('deleted_at', null);

  const snapshots: OrgBillingSnapshot[] = [];
  const seenOrgIds = new Set<string>();

  for (const row of memberRows ?? []) {
    const rid = String((row as MemberRow).organization_id ?? '');
    if (!rid || seenOrgIds.has(rid)) continue;
    seenOrgIds.add(rid);
    snapshots.push((row as MemberRow).organizations);
  }

  for (const o of ownedRows ?? []) {
    const oid = String((o as OwnedRow).id ?? '');
    if (!oid || seenOrgIds.has(oid)) continue;
    seenOrgIds.add(oid);
    snapshots.push({
      subscription_status: (o as OwnedRow).subscription_status,
      trial_ends_at: (o as OwnedRow).trial_ends_at,
      license_expires_at: (o as OwnedRow).license_expires_at,
      license_unlimited: (o as OwnedRow).license_unlimited,
    });
  }

  return snapshots;
}

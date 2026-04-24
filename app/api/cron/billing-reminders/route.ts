import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { pickBillingPreExpiryEmailReminder, type OrgBillingSnapshot } from '@/lib/billing-expiry-warning';
import { sendBillingReminderToOwner } from '@/lib/notifications/billing-reminder-email';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

type OrgRow = {
  id: string;
  name: string;
  owner_id: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  license_expires_at: string | null;
  license_unlimited: boolean | null;
  billing_reminder_sent_for_trial_end: string | null;
  billing_reminder_sent_for_license_end: string | null;
};

/**
 * Cron diario (Vercel Cron): envía un email al owner en los 3 días previos al vencimiento
 * (p. ej. día 27 si el periodo vence día 30) si aún no se notificó para esa fecha de fin.
 *
 * Cabecera: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET no configurado' }, { status: 500 });
  }
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (token !== secret) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: 'Falta Supabase service' }, { status: 500 });
  }

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: rows, error } = await admin.from('organizations').select(
    'id, name, owner_id, subscription_status, trial_ends_at, license_expires_at, license_unlimited, billing_reminder_sent_for_trial_end, billing_reminder_sent_for_license_end'
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const orgs = (rows ?? []).filter(
    (o) =>
      (o as OrgRow).license_unlimited !== true &&
      (o as OrgRow).subscription_status !== 'suspended' &&
      (o as OrgRow).subscription_status !== 'cancelled'
  ) as OrgRow[];
  let checked = 0;
  let emailed = 0;
  let skipped = 0;

  for (const org of orgs) {
    checked++;
    const snap: OrgBillingSnapshot = {
      subscription_status: org.subscription_status,
      trial_ends_at: org.trial_ends_at,
      license_expires_at: org.license_expires_at,
      license_unlimited: org.license_unlimited,
    };
    const reminder = pickBillingPreExpiryEmailReminder([snap]);
    if (!reminder) {
      skipped++;
      continue;
    }

    if (reminder.kind === 'trial') {
      if (
        org.billing_reminder_sent_for_trial_end &&
        org.trial_ends_at &&
        org.billing_reminder_sent_for_trial_end === org.trial_ends_at
      ) {
        skipped++;
        continue;
      }
    } else {
      if (
        org.billing_reminder_sent_for_license_end &&
        org.license_expires_at &&
        org.billing_reminder_sent_for_license_end === org.license_expires_at
      ) {
        skipped++;
        continue;
      }
    }

    if (!org.owner_id) {
      skipped++;
      continue;
    }

    const { data: userData, error: userErr } = await admin.auth.admin.getUserById(org.owner_id);
    if (userErr || !userData?.user?.email) {
      skipped++;
      continue;
    }

    const result = await sendBillingReminderToOwner({
      toEmail: userData.user.email,
      shopName: org.name || 'Tu taller',
      org: {
        ...snap,
        billing_reminder_sent_for_trial_end: org.billing_reminder_sent_for_trial_end,
        billing_reminder_sent_for_license_end: org.billing_reminder_sent_for_license_end,
      },
    });

    if (!result.sent) {
      skipped++;
      continue;
    }

    const patch: Record<string, string | null> = {};
    if (result.kind === 'trial' && org.trial_ends_at) {
      patch.billing_reminder_sent_for_trial_end = org.trial_ends_at;
    }
    if (result.kind === 'license' && org.license_expires_at) {
      patch.billing_reminder_sent_for_license_end = org.license_expires_at;
    }

    if (Object.keys(patch).length > 0) {
      await admin.from('organizations').update(patch).eq('id', org.id);
    }

    emailed++;
  }

  return NextResponse.json({ ok: true, checked, emailed, skipped });
}

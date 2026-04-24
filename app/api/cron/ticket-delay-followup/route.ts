import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  mergeDelayFollowupSettings,
  getFirstNotifyDays,
  waitReasonLabel,
  delayStatusLabelEs,
  type DelayFollowupSettings,
} from '@/lib/ticket-delay-followup';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

type TicketRow = {
  id: string;
  organization_id: string | null;
  ticket_number: string;
  status: string;
  assigned_to: string | null;
  follow_up_wait_reason: string | null;
  follow_up_snoozed_until: string | null;
  follow_up_started_at: string;
  follow_up_notify_count: number | null;
  follow_up_last_notified_at: string | null;
};

type TechRow = { id: string; panel_user_id: string | null };

function isValidUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

function daysBetween(later: Date, earlier: Date): number {
  return Math.floor((later.getTime() - earlier.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Cron diario (Vercel Cron): avisos de seguimiento en la campana para tickets largos en estados de espera.
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
    return NextResponse.json({ error: 'Faltan variables Supabase' }, { status: 500 });
  }

  const supabase = createClient(url, key);
  const now = new Date();

  let processed = 0;
  let notified = 0;
  const errors: string[] = [];

  const pageSize = 200;
  let offset = 0;

  for (;;) {
    const { data: tickets, error: qErr } = await supabase
      .from('repair_tickets')
      .select(
        'id, organization_id, ticket_number, status, assigned_to, follow_up_wait_reason, follow_up_snoozed_until, follow_up_started_at, follow_up_notify_count, follow_up_last_notified_at'
      )
      .not('follow_up_started_at', 'is', null)
      .range(offset, offset + pageSize - 1);

    if (qErr) {
      errors.push(qErr.message);
      break;
    }
    const batch = (tickets || []) as TicketRow[];
    if (batch.length === 0) break;

    const orgIds = Array.from(
      new Set(batch.map((t) => t.organization_id).filter((x): x is string => !!x))
    );
    const orgToRawSettings = new Map<string, unknown>();

    if (orgIds.length > 0) {
      const { data: settingRows, error: sErr } = await supabase
        .from('shop_settings')
        .select('organization_id, delay_followup_settings, updated_at')
        .in('organization_id', orgIds);
      if (sErr) {
        errors.push(`shop_settings: ${sErr.message}`);
      } else {
        const best = new Map<string, { raw: unknown; t: number }>();
        for (const r of settingRows || []) {
          const oid = r.organization_id as string | null | undefined;
          if (!oid) continue;
          const t = new Date((r.updated_at as string) || 0).getTime();
          const prev = best.get(oid);
          if (!prev || t > prev.t) best.set(oid, { raw: r.delay_followup_settings, t });
        }
        for (const [oid, v] of Array.from(best.entries())) orgToRawSettings.set(oid, v.raw);
      }
    }

    const techIds = Array.from(
      new Set(batch.map((t) => t.assigned_to).filter((x): x is string => !!x && isValidUuid(x)))
    );
    const techMap = new Map<string, TechRow>();
    if (techIds.length > 0) {
      const { data: techRows, error: tErr } = await supabase
        .from('technicians')
        .select('id, panel_user_id')
        .in('id', techIds);
      if (tErr) {
        errors.push(`technicians: ${tErr.message}`);
      } else {
        for (const tr of (techRows || []) as TechRow[]) techMap.set(tr.id, tr);
      }
    }

    for (const t of batch) {
      processed++;
      if (!t.organization_id) continue;
      if (!t.assigned_to || !isValidUuid(t.assigned_to)) continue;

      const settings: DelayFollowupSettings = mergeDelayFollowupSettings(orgToRawSettings.get(t.organization_id));
      if (!settings.enabled) continue;
      if (!settings.statuses.includes(t.status)) continue;

      if (t.follow_up_snoozed_until) {
        const until = new Date(t.follow_up_snoozed_until);
        if (!Number.isNaN(until.getTime()) && until > now) continue;
      }

      const started = new Date(t.follow_up_started_at);
      if (Number.isNaN(started.getTime())) continue;

      const daysSinceStart = daysBetween(now, started);
      const firstDays = getFirstNotifyDays(settings, t.follow_up_wait_reason);
      if (daysSinceStart < firstDays) continue;

      const count = t.follow_up_notify_count ?? 0;
      if (count >= settings.max_notifications_per_ticket) continue;

      if (count > 0) {
        const last = t.follow_up_last_notified_at ? new Date(t.follow_up_last_notified_at) : null;
        if (!last || Number.isNaN(last.getTime())) continue;
        if (daysBetween(now, last) < settings.repeat_every_days) continue;
      }

      const tech = techMap.get(t.assigned_to);
      const panelUserId = tech?.panel_user_id;
      if (!panelUserId) continue;

      const { error: delErr } = await supabase
        .from('panel_notifications')
        .delete()
        .eq('kind', 'ticket_delay_followup')
        .eq('ticket_id', t.id)
        .eq('user_id', panelUserId)
        .is('read_at', null);
      if (delErr) {
        errors.push(`delete ${t.id}: ${delErr.message}`);
        continue;
      }

      const statusLabel = delayStatusLabelEs(t.status);
      const reasonLabel = waitReasonLabel(t.follow_up_wait_reason);
      const title = `Seguimiento: ${t.ticket_number}`;
      const body = `Lleva ${daysSinceStart} día(s) en «${statusLabel}». Motivo: ${reasonLabel}. Revisa el avance.`;

      const { error: insErr } = await supabase.from('panel_notifications').insert({
        organization_id: t.organization_id,
        user_id: panelUserId,
        kind: 'ticket_delay_followup',
        title,
        body,
        ticket_id: t.id,
      });

      if (insErr) {
        errors.push(`insert ${t.id}: ${insErr.message}`);
        continue;
      }

      const { error: upErr } = await supabase
        .from('repair_tickets')
        .update({
          follow_up_notify_count: count + 1,
          follow_up_last_notified_at: now.toISOString(),
        })
        .eq('id', t.id);

      if (upErr) {
        errors.push(`update ${t.id}: ${upErr.message}`);
        continue;
      }

      notified++;
    }

    offset += pageSize;
    if (batch.length < pageSize) break;
  }

  return NextResponse.json({
    ok: true,
    processed,
    notified,
    errors: errors.slice(0, 25),
  });
}

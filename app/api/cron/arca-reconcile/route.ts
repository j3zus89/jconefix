/**
 * Cron job de reconciliación AFIP.
 *
 * Programado en `vercel.json`: 1 vez al día (06:00 UTC) para cumplir el límite de crons del plan
 * Vercel Hobby (solo diarios). En plan Pro podés usar un schedule cada 5 minutos en `vercel.json` si lo necesitás.
 *
 * Busca facturas `ar_status = 'pending'` y las reconcilia contra AFIP:
 *  - Si AFIP ya emitió el CAE → recuperar y marcar `afip_approved`
 *  - Si no hay CAE y pasaron +4h → marcar `failed`
 *  - Si es reciente → dejar pending (próximo ciclo lo revisará)
 *
 * SEGURIDAD: solo callable desde Vercel Cron (verifica CRON_SECRET).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { reconcileAfipPendingInvoices } from '@/lib/server/arca-reconcile';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET no configurado' }, { status: 500 });
  }
  const authHeader = req.headers.get('authorization') ?? '';
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const admin = adminClient();
    const result = await reconcileAfipPendingInvoices(admin);

    console.log(
      `[AFIP RECONCILE] processed=${result.processed} recovered=${result.recovered} failed=${result.failed} skipped=${result.skipped}`
    );

    if (result.errors.length > 0) {
      console.error('[AFIP RECONCILE] Errors:', result.errors);
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error('[AFIP RECONCILE] Fatal error:', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

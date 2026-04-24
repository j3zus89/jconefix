import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientFromRequest } from '@/lib/supabase/server';
import { processPanelLoginReport } from '@/lib/auth/panel-login-report-server';
import type { PanelLoginReportSource } from '@/lib/auth/panel-login-types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClientFromRequest(req);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  let body: { source?: string; device?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    /* sendBeacon u otro cliente sin JSON */
  }

  const source: PanelLoginReportSource =
    body.source === 'super_admin' ? 'super_admin' : 'panel';
  const device =
    typeof body.device === 'string' && body.device.length > 0
      ? body.device
      : req.headers.get('user-agent');

  const fwd = req.headers.get('x-forwarded-for');
  const ip =
    fwd?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    null;

  await processPanelLoginReport({
    userId: user.id,
    email: user.email ?? '',
    source,
    device,
    ip,
  });

  return NextResponse.json({ ok: true });
}

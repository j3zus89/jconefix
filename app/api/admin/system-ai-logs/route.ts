import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSuperAdminFromRequest } from '@/lib/auth/super-admin-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdminFromRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status, headers: { 'Cache-Control': 'no-store' } });
  }
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
  }

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '150', 10), 500);
  const orgId = req.nextUrl.searchParams.get('orgId');

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let q = admin
    .from('system_ai_error_logs')
    .select('id, created_at, user_id, organization_id, source, http_status, provider_message, model, extra')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (orgId) q = q.eq('organization_id', orgId);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json(
      { error: error.message, hint: '¿Aplicaste la migración system_ai_error_logs?' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  return NextResponse.json({ data: data ?? [] }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}

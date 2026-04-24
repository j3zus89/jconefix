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
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: auth.status, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
  }

  const rawLimit = parseInt(req.nextUrl.searchParams.get('limit') || '200', 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(500, Math.max(1, rawLimit)) : 200;

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin
    .from('commercial_signup_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    const msg = String(error.message || '').toLowerCase();
    if (msg.includes('does not exist') || msg.includes('relation') || msg.includes('schema cache')) {
      return NextResponse.json(
        {
          error:
            'Falta la tabla commercial_signup_requests. Aplica en Supabase la migración 20260402102_plan_basico_profesional_license.sql (supabase db push o SQL editor).',
        },
        { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }

  return NextResponse.json(
    { data: data ?? [] },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}

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

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '100', 10), 500);
  const orgId = req.nextUrl.searchParams.get('orgId');
  const search = (req.nextUrl.searchParams.get('search') || '').trim().toLowerCase();

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let q = supabaseAdmin
    .from('super_admin_audit_log')
    .select('id, admin_user_id, action, target_organization_id, target_user_id, details, ip_address, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (orgId) q = q.eq('target_organization_id', orgId);
  if (search) q = q.or(`action.ilike.%${search}%,ip_address.ilike.%${search}%`);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    { data: data || [] },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}


import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdminFromRequest } from '@/lib/auth/super-admin-server';

export async function GET(request: NextRequest) {
  // Sólo super-admins pueden acceder a este endpoint de diagnóstico
  const auth = await requireSuperAdminFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: 'No autorizado' }, { status: auth.status });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'Service key missing' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { count, error: countError } = await supabaseAdmin
      .from('organizations')
      .select('*', { count: 'exact', head: true });

    const { data: allOrgs, error: allError } = await supabaseAdmin
      .from('organizations')
      .select('id,name,slug,deleted_at,created_at,subscription_status');

    const { data: activeOrgs, error: activeError } = await supabaseAdmin
      .from('organizations')
      .select('id,name,slug,created_at,subscription_status')
      .is('deleted_at', null);

    return NextResponse.json({
      debug: {
        total_count: count,
        all_orgs_count: allOrgs?.length,
        active_orgs_count: activeOrgs?.length,
      },
      all_organizations: allOrgs,
      active_organizations: activeOrgs,
      errors: { count: countError, all: allError, active: activeError }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

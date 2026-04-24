import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdminFromRequest } from '@/lib/auth/super-admin-server';

export async function POST(request: NextRequest) {
  // Sólo super-admins pueden eliminar organizaciones
  const auth = await requireSuperAdminFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: 'No autorizado' }, { status: auth.status });
  }

  try {
    const { orgId, action } = await request.json();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    if (action === 'delete_org') {
      const { error: rpcError } = await adminClient.rpc('delete_organization', {
        p_org_id: orgId
      });

      if (rpcError) {
        console.error('RPC error, trying REST fallback:', rpcError);
        const res = await fetch(`${supabaseUrl}/rest/v1/rpc/delete_organization`, {
          method: 'POST',
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ p_org_id: orgId })
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Delete failed: ${text}`);
        }
      }

      return NextResponse.json({ success: true, message: 'Eliminado' });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });

  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

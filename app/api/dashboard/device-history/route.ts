import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireOrganizationMemberFromRequest } from '@/lib/auth/org-admin-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function adminDb() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * GET /api/dashboard/device-history?imei=xxx&serial=yyy&exclude=ticketId
 * Devuelve los tickets anteriores de un dispositivo identificado por IMEI o número de serie.
 */
export async function GET(req: NextRequest) {
  const auth = await requireOrganizationMemberFromRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'No autorizado' }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const imei = searchParams.get('imei')?.trim() ?? '';
  const serial = searchParams.get('serial')?.trim() ?? '';
  const exclude = searchParams.get('exclude')?.trim() ?? '';

  if (!imei && !serial) {
    return NextResponse.json({ tickets: [] });
  }

  const db = adminDb();

  // Construimos los filtros OR para IMEI y serial (solo los que tengan valor)
  const orParts: string[] = [];
  if (imei) orParts.push(`imei.eq.${imei}`, `serial_number.eq.${imei}`);
  if (serial && serial !== imei) orParts.push(`serial_number.eq.${serial}`, `imei.eq.${serial}`);

  let query = db
    .from('repair_tickets')
    .select(
      'id, ticket_number, status, issue_description, created_at, device_type, device_brand, device_model, imei, serial_number, customer_id, customers(id, name)'
    )
    .eq('organization_id', auth.organizationId)
    .or(orParts.join(','))
    .order('created_at', { ascending: false })
    .limit(20);

  if (exclude) {
    query = query.neq('id', exclude);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[device-history] error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tickets: data ?? [] });
}

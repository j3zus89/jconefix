import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSuperAdminFromRequest } from '@/lib/auth/super-admin-server';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdminFromRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });
  }
  const userId = req.nextUrl.searchParams.get('userId')?.trim();
  if (!userId) {
    return NextResponse.json({ error: 'userId requerido' }, { status: 400 });
  }
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin
    .from('subscription_payments')
    .select(
      'id, created_at, organization_id, mercado_pago_payment_id, transaction_amount, currency_id, payment_method_id, payment_type_id, status, billing_cycle, date_approved'
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return NextResponse.json({ payments: [], note: 'Ejecutá la migración subscription_payments en Supabase.' });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ payments: data ?? [] });
}

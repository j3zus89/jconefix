import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { resolveOrganizationForMercadoPago } from '@/lib/resolve-organization-for-payment';
import { PUBLIC_TRIAL_DAYS } from '@/lib/org-plan';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !service) {
      return NextResponse.json({ error: 'Configuración del servidor incompleta' }, { status: 500 });
    }

    const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });
    const resolved = await resolveOrganizationForMercadoPago(admin, user.id);
    if (!resolved.ok) {
      if (resolved.reason === 'db_policy_or_key') {
        return NextResponse.json(
          {
            error:
              'Configuración del servidor: revisá SUPABASE_SERVICE_ROLE_KEY (debe ser service_role) en el entorno de despliegue.',
          },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: 'Sin organización' }, { status: 404 });
    }

    const orgId = resolved.organizationId;

    const { data: org, error: orgErr } = await admin
      .from('organizations')
      .select(
        'name, subscription_status, trial_ends_at, license_expires_at, license_unlimited, billing_cycle, country, currency'
      )
      .eq('id', orgId)
      .maybeSingle();

    if (orgErr || !org) {
      return NextResponse.json({ error: orgErr?.message || 'Organización no encontrada' }, { status: 500 });
    }

    const { data: payments, error: payErr } = await admin
      .from('subscription_payments')
      .select(
        'id, created_at, mercado_pago_payment_id, transaction_amount, billing_cycle, payment_type_id, payment_method_id, status, date_approved'
      )
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(25);

    if (payErr) {
      if (payErr.code === '42P01' || payErr.message.includes('does not exist')) {
        return NextResponse.json({
          organization: org,
          payments: [],
          trialDays: PUBLIC_TRIAL_DAYS,
          note: 'Ejecutá la migración subscription_payments en Supabase.',
        });
      }
      return NextResponse.json({ error: payErr.message }, { status: 500 });
    }

    return NextResponse.json({
      organization: org,
      payments: payments ?? [],
      trialDays: PUBLIC_TRIAL_DAYS,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

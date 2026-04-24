import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { getAuthUserFromApiRequest } from '@/lib/auth/get-auth-user-from-api-request';
import {
  allOrganizationsAdminClosedForSelfService,
  PAYMENT_BLOCKED_ADMIN_SUSPENSION_ES,
} from '@/lib/billing-expiry-warning';
import { fetchOrgBillingSnapshotsForUser } from '@/lib/fetch-org-billing-snapshots-admin';
import { resolveOrganizationForMercadoPago } from '@/lib/resolve-organization-for-payment';
import { createMercadoPagoSubscriptionPreference } from '@/lib/mercadopago-subscription';
import { normalizeBillingCycle } from '@/lib/org-plan';
import { DEFAULT_PUBLIC_SITE_URL } from '@/lib/site-canonical';

export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  cycle: z.enum(['mensual', 'anual']).optional(),
});

export async function POST(req: NextRequest) {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_PUBLIC_SITE_URL).replace(/\/$/, '').trim();
  if (!accessToken) {
    return NextResponse.json(
      { error: 'MERCADOPAGO_ACCESS_TOKEN no está configurado en el servidor.' },
      { status: 500 }
    );
  }

  const user = await getAuthUserFromApiRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Iniciá sesión para generar el pago con tu cuenta.' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!service) {
    return NextResponse.json({ error: 'Configuración del servidor incompleta.' }, { status: 500 });
  }

  const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });

  const billingSnapshots = await fetchOrgBillingSnapshotsForUser(admin, user.id);
  if (allOrganizationsAdminClosedForSelfService(billingSnapshots)) {
    return NextResponse.json({ error: PAYMENT_BLOCKED_ADMIN_SUSPENSION_ES }, { status: 403 });
  }

  const sanity = await admin.from('organizations').select('id').limit(1).maybeSingle();
  if (sanity.error) {
    const msg = sanity.error.message || '';
    if (/unauthorized|policy/i.test(msg)) {
      console.error('[mp-preference] service role / DB:', sanity.error);
      return NextResponse.json(
        {
          error:
            'Error de configuración del servidor: la clave de base de datos no tiene permisos de administrador. En Vercel, SUPABASE_SERVICE_ROLE_KEY debe ser la clave «service_role» del proyecto Supabase (no la anon).',
        },
        { status: 500 }
      );
    }
  }

  const resolved = await resolveOrganizationForMercadoPago(admin, user.id);
  if (!resolved.ok) {
    if (resolved.reason === 'db_policy_or_key') {
      return NextResponse.json(
        {
          error:
            'Error de configuración del servidor: la base de datos rechazó la consulta (clave de servicio incorrecta o RLS). En Vercel, SUPABASE_SERVICE_ROLE_KEY debe ser la clave «service_role» de Supabase.',
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: 'No se encontró tu organización o no tenés permiso para iniciar el pago.' },
      { status: 400 }
    );
  }

  const { ownerId } = resolved;

  let cycle: 'mensual' | 'anual' = 'mensual';
  try {
    const json = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(json);
    if (parsed.success && parsed.data.cycle) {
      cycle = normalizeBillingCycle(parsed.data.cycle);
    }
  } catch {
    /* default mensual */
  }

  const pref = await createMercadoPagoSubscriptionPreference({
    accessToken,
    externalReferenceUserId: ownerId,
    cycle,
    payerEmail: user.email ?? null,
    publicSiteUrl: siteUrl,
  });

  if (!pref.ok) {
    return NextResponse.json({ error: pref.error }, { status: 502 });
  }

  return NextResponse.json({
    init_point: pref.init_point,
    preference_id: pref.preference_id,
  });
}

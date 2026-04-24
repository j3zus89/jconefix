import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireOrganizationAdminFromRequest } from '@/lib/auth/org-admin-server';
import { testArcaAfipConnection } from '@/lib/server/arca-test-connection';
import { AFIP_MOCK_MODE } from '@/lib/server/arca-mock';

export const dynamic = 'force-dynamic';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function admin() {
  return createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function assertArgentinaOrg(orgId: string): Promise<boolean> {
  const { data } = await admin().from('organizations').select('country').eq('id', orgId).maybeSingle();
  return String(data?.country || '').toUpperCase() === 'AR';
}

/** POST: prueba certificado + token + WSFE en 4 pasos sin emitir comprobantes. */
export async function POST(_req: NextRequest) {
  const auth = await requireOrganizationAdminFromRequest(_req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'No autorizado' }, { status: auth.status });
  }
  if (!(await assertArgentinaOrg(auth.organizationId))) {
    return NextResponse.json({ error: 'Solo disponible para organizaciones en Argentina.' }, { status: 403 });
  }

  if (AFIP_MOCK_MODE) {
    console.log('[AFIP MOCK] POST /api/dashboard/arca-test-connection → modo simulación');
  }

  const result = await testArcaAfipConnection(admin(), auth.organizationId);

  const status = result.ok ? 200 : 422;
  return NextResponse.json({
    ok: result.ok,
    isMock: 'isMock' in result ? result.isMock : false,
    environment: 'environment' in result ? result.environment : undefined,
    steps: result.steps,
    salesPoints: 'salesPoints' in result ? result.salesPoints : [],
    lastVoucherNumber: 'lastVoucherNumber' in result ? result.lastVoucherNumber : undefined,
    cbteTipoProbed: 'cbteTipoProbed' in result ? result.cbteTipoProbed : undefined,
    puntoVentaProbed: 'puntoVentaProbed' in result ? result.puntoVentaProbed : undefined,
    puntoVentaMismatch: 'puntoVentaMismatch' in result ? (result.puntoVentaMismatch ?? false) : false,
    message: result.message,
  }, { status });
}

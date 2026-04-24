import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireOrganizationMemberFromRequest } from '@/lib/auth/org-admin-server';
import { authorizeInvoiceWithArcaIfConfigured } from '@/lib/server/arca-invoice-authorize';

export const dynamic = 'force-dynamic';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function admin() {
  return createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** Solicita CAE en ARCA/AFIP para una factura Argentina (o la omite si no hay credenciales). */
export async function POST(req: NextRequest) {
  const auth = await requireOrganizationMemberFromRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'No autorizado' }, { status: auth.status });
  }

  let body: { invoiceId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const invoiceId = String(body.invoiceId || '').trim();
  if (!invoiceId) {
    return NextResponse.json({ error: 'Falta invoiceId' }, { status: 400 });
  }

  const result = await authorizeInvoiceWithArcaIfConfigured(admin(), auth.organizationId, invoiceId);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    skipped: result.skipped,
    ar_cae: result.cae,
    ar_cae_expires_at: result.caeFchVto,
    ar_numero_cbte: result.voucherNumber,
    ar_cbte_tipo: result.cbteTipo,
    ar_punto_venta: result.ptoVta,
    ar_cuit_emisor: result.cuitEmisor != null ? String(result.cuitEmisor) : null,
  });
}

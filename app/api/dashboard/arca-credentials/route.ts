import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireOrganizationAdminFromRequest } from '@/lib/auth/org-admin-server';
import { encryptArcaSecret } from '@/lib/arca-credentials-crypto';
import { extractPemFromPkcs12, extractCertInfoFromPem } from '@/lib/arca-pkcs12';
import { getWebFormData } from '@/lib/web-request-formdata';

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

/**
 * POST multipart/form-data:
 * - mode: pem | p12
 * - cert: archivo .crt/.pem (modo pem)
 * - key: archivo .key (modo pem)
 * - p12: archivo .p12/.pfx (modo p12)
 * - p12Password: texto (modo p12)
 */
export async function POST(req: NextRequest) {
  const auth = await requireOrganizationAdminFromRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'No autorizado' }, { status: auth.status });
  }
  if (!(await assertArgentinaOrg(auth.organizationId))) {
    return NextResponse.json({ error: 'Solo disponible para organizaciones en Argentina.' }, { status: 403 });
  }

  try {
    encryptArcaSecret('ping', auth.organizationId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Clave de cifrado no configurada.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const form = await getWebFormData(req);
  const mode = String(form.get('mode') || 'pem').toLowerCase();

  let certPem: string;
  let keyPem: string;

  if (mode === 'p12') {
    const file = form.get('p12');
    const password = String(form.get('p12Password') || '');
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Adjuntá el archivo .p12 / .pfx.' }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: 'Indicá la contraseña del .p12.' }, { status: 400 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    try {
      const extracted = extractPemFromPkcs12(buf, password);
      certPem = extracted.cert;
      keyPem = extracted.key;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al leer .p12';
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  } else {
    const certFile = form.get('cert');
    const keyFile = form.get('key');
    if (!(certFile instanceof File) || !(keyFile instanceof File)) {
      return NextResponse.json({ error: 'Adjuntá cert (.crt/.pem) y clave privada (.key).' }, { status: 400 });
    }
    certPem = await certFile.text();
    keyPem = await keyFile.text();
    if (!certPem.includes('BEGIN CERTIFICATE') || !keyPem.includes('PRIVATE KEY')) {
      return NextResponse.json(
        { error: 'Los archivos no parecen PEM válidos (certificado y clave privada).' },
        { status: 400 }
      );
    }
  }

  const certEnc = encryptArcaSecret(certPem, auth.organizationId);
  const keyEnc = encryptArcaSecret(keyPem, auth.organizationId);

  // Extraer metadatos del certificado ANTES de guardar (para pre-flight validation)
  const certInfo = extractCertInfoFromPem(certPem);

  const db = admin();
  const { error } = await db.from('organization_arca_credentials').upsert(
    {
      organization_id: auth.organizationId,
      cert_pem_enc: certEnc,
      key_pem_enc: keyEnc,
      cert_expires_at: certInfo.expiresAt ?? null,
      cert_cuit_detected: certInfo.cuitDetected ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'organization_id' }
  );

  if (error) {
    console.error('[arca-credentials] upsert failed');
    return NextResponse.json({ error: 'No se pudieron guardar las credenciales.' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    cuitDetected: certInfo.cuitDetected,
    expiresAt: certInfo.expiresAt,
    subjectCN: certInfo.subjectCN,
  });
}

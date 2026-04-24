import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getActiveOrganizationId } from '@/lib/dashboard-org';
import { getWebFormData } from '@/lib/web-request-formdata';
import { STORAGE_SIGNED_URL_TTL_SEC } from '@/lib/supabase-storage-signed';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const MAX_BYTES = 6 * 1024 * 1024;
const ALLOWED = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const orgId = await getActiveOrganizationId(supabase);
    if (!orgId) {
      return NextResponse.json({ error: 'Sin organización activa' }, { status: 400 });
    }

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
    }

    let form: globalThis.FormData;
    try {
      form = await getWebFormData(request);
    } catch {
      return NextResponse.json({ error: 'FormData inválido' }, { status: 400 });
    }

    const file = form.get('file');
    if (!file || !(file instanceof Blob) || file.size === 0) {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Archivo demasiado grande (máx. 6 MB)' }, { status: 400 });
    }

    const type = (file.type || 'application/octet-stream').toLowerCase();
    if (!ALLOWED.has(type)) {
      return NextResponse.json(
        { error: 'Tipo no permitido. Usa JPG, PNG, WebP, GIF o PDF.' },
        { status: 400 }
      );
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const buf = Buffer.from(await file.arrayBuffer());
    const ext =
      type === 'image/png'
        ? 'png'
        : type === 'image/webp'
          ? 'webp'
          : type === 'image/gif'
            ? 'gif'
            : type === 'application/pdf'
              ? 'pdf'
              : 'jpg';
    const safeOrg = orgId.replace(/[^a-f0-9-]/gi, '');
    const path = `${safeOrg}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

    const { error: upErr } = await admin.storage.from('team_chat_uploads').upload(path, buf, {
      contentType: type,
      upsert: false,
    });

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    const { data: signed, error: signErr } = await admin.storage
      .from('team_chat_uploads')
      .createSignedUrl(path, STORAGE_SIGNED_URL_TTL_SEC);

    return NextResponse.json({
      path,
      signedUrl: signErr ? null : signed?.signedUrl ?? null,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireOrganizationMemberFromRequest } from '@/lib/auth/org-admin-server';
import { smartImportGridSchema } from '@/lib/smart-import/request-body';
import { commitSmartImport } from '@/lib/smart-import/commit-rows';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const auth = await requireOrganizationMemberFromRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'No autorizado' }, { status: auth.status });
  }

  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : '';
  if (!token) {
    return NextResponse.json({ error: 'Falta token de sesión' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = smartImportGridSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { mode, headers, rows, mapping } = parsed.data;

  const result = await commitSmartImport({
    accessToken: token,
    userId: auth.user.id,
    organizationId: auth.organizationId,
    mode,
    headers,
    rows,
    mapping,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json({ summary: result.summary });
}

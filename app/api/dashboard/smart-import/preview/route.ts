import { NextRequest, NextResponse } from 'next/server';
import { requireOrganizationMemberFromRequest } from '@/lib/auth/org-admin-server';
import { smartImportGridSchema } from '@/lib/smart-import/request-body';
import { validateImportRows } from '@/lib/smart-import/validate-rows';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const auth = await requireOrganizationMemberFromRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'No autorizado' }, { status: auth.status });
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
  const preview = validateImportRows(headers, rows, mapping, mode);
  const errorCount = preview.filter((p) => !p.ok).length;
  const warningCount = preview.reduce((n, p) => n + p.warnings.length, 0);

  return NextResponse.json({
    preview,
    totals: {
      rows: rows.length,
      errors: errorCount,
      warnings: warningCount,
      ok: errorCount === 0,
    },
  });
}

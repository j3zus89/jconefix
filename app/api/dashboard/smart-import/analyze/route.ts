import { NextRequest, NextResponse } from 'next/server';
import { requireOrganizationMemberFromRequest } from '@/lib/auth/org-admin-server';
import { parseFirstSheetToGrid } from '@/lib/smart-import/parse-workbook';
import { suggestMapping } from '@/lib/smart-import/suggest-mapping';
import type { SmartImportMode } from '@/lib/smart-import/constants';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const auth = await requireOrganizationMemberFromRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'No autorizado' }, { status: auth.status });
  }

  let mode: SmartImportMode = 'customers_only';
  try {
    const ct = req.headers.get('content-type') || '';
    if (ct.includes('multipart/form-data')) {
      const form = await req.formData();
      const m = String(form.get('mode') || '').trim();
      if (m === 'customers_and_tickets' || m === 'customers_only') mode = m;
      const file = form.get('file');
      if (!file || !(file instanceof Blob)) {
        return NextResponse.json({ error: 'Falta el archivo (campo file).' }, { status: 400 });
      }
      const buf = await file.arrayBuffer();
      const { headers, rows, truncated, sheetName, blankRowsSkipped, physicalDataRowsInRange } =
        parseFirstSheetToGrid(buf);
      if (!headers.some((h) => h.trim())) {
        return NextResponse.json(
          { error: 'No se detectaron cabeceras en la primera fila de la primera hoja.' },
          { status: 400 }
        );
      }
      const suggestedMapping = suggestMapping(headers, mode, rows);
      const sampleRows = rows.slice(0, 15);
      return NextResponse.json({
        headers,
        rows,
        sampleRows,
        suggestedMapping,
        rowCount: rows.length,
        blankRowsSkipped,
        physicalDataRowsInRange,
        truncated,
        sheetName,
        mode,
      });
    }
  } catch (e: any) {
    console.error('[smart-import/analyze]', e);
    return NextResponse.json(
      { error: e?.message || 'No se pudo leer el Excel.' },
      { status: 400 }
    );
  }

  return NextResponse.json({ error: 'Usa multipart/form-data con file y opcionalmente mode.' }, { status: 400 });
}

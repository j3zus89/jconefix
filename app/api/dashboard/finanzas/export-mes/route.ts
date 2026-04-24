import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import { createSupabaseServerClientFromRequest } from '@/lib/supabase/server';
import { getActiveOrganizationId } from '@/lib/dashboard-org';
import { loadInvoicePrintPayloadForExport } from '@/lib/invoice-export-load-payload';
import { buildInvoicePrintFullHtmlDocument } from '@/lib/invoice-print-html';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function csvEscape(s: string) {
  const t = String(s ?? '');
  if (t.includes('"') || t.includes(',') || t.includes('\n') || t.includes('\r')) {
    return `"${t.replace(/"/g, '""')}"`;
  }
  return t;
}

function safeFileSegment(name: string) {
  return String(name || 'archivo')
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '_')
    .slice(0, 120);
}

/**
 * POST JSON: { year: number, month: number } (month 1-12)
 * Devuelve application/zip con carpetas YYYY-MM-Ventas y YYYY-MM-Gastos.
 */
export async function POST(request: Request) {
  try {
    const supabase = createSupabaseServerClientFromRequest(request);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    let body: { year?: number; month?: number };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }

    const year = Number(body.year);
    const month = Number(body.month);
    if (!Number.isFinite(year) || year < 2000 || year > 2100 || !Number.isFinite(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: 'Año o mes no válidos' }, { status: 400 });
    }

    const orgId = await getActiveOrganizationId(supabase);

    const startIso = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)).toISOString();
    const endIso = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)).toISOString();

    const startDate = `${year}-${pad2(month)}-01`;
    const endDate = month === 12 ? `${year + 1}-01-01` : `${year}-${pad2(month + 1)}-01`;

    let invQuery = (supabase as any)
      .from('invoices')
      .select(
        'id, invoice_number, created_at, customer_name, total_amount, payment_status, status, organization_id, shop_owner_id'
      )
      .gte('created_at', startIso)
      .lt('created_at', endIso)
      .order('created_at', { ascending: true });

    if (orgId) {
      invQuery = invQuery.eq('organization_id', orgId);
    } else {
      invQuery = invQuery.eq('shop_owner_id', user.id);
    }

    const { data: invoiceRows, error: invListErr } = await invQuery;
    if (invListErr) {
      return NextResponse.json({ error: invListErr.message }, { status: 500 });
    }

    let expQuery = (supabase as any)
      .from('expenses')
      .select('id, title, amount, category, date, notes, receipt_url')
      .gte('date', startDate)
      .lt('date', endDate)
      .order('date', { ascending: true });

    if (orgId) expQuery = expQuery.eq('organization_id', orgId);
    else expQuery = expQuery.eq('user_id', user.id);

    const { data: expenseRows, error: expListErr } = await expQuery;
    if (expListErr) {
      return NextResponse.json({ error: expListErr.message }, { status: 500 });
    }

    const { data: shopRow } = await (supabase as any)
      .from('shop_settings')
      .select('currency_symbol, shop_name')
      .eq('user_id', user.id)
      .maybeSingle();

    const currencyLabel = String(shopRow?.currency_symbol || '€').trim() || '€';
    const shopName = String(shopRow?.shop_name || 'Taller').trim();

    const zip = new JSZip();
    const ventasFolder = `${year}-${pad2(month)}-Ventas`;
    const gastosFolder = `${year}-${pad2(month)}-Gastos`;

    const invLines = [
      ['Factura', 'Fecha (UTC)', 'Cliente', `Total (${currencyLabel})`, 'Estado pago', 'Estado factura'].join(','),
    ];
    for (const row of invoiceRows || []) {
      invLines.push(
        [
          csvEscape(String(row.invoice_number)),
          csvEscape(String(row.created_at || '').slice(0, 19)),
          csvEscape(String(row.customer_name || '')),
          csvEscape(String(row.total_amount ?? '')),
          csvEscape(String(row.payment_status || '')),
          csvEscape(String(row.status || '')),
        ].join(',')
      );
    }
    zip.file(`${ventasFolder}/resumen_ventas.csv`, invLines.join('\n'), { unixPermissions: 0o644 });

    for (const row of invoiceRows || []) {
      const id = String(row.id);
      const loaded = await loadInvoicePrintPayloadForExport(supabase, id, orgId);
      if (!loaded) continue;
      const html = buildInvoicePrintFullHtmlDocument(loaded.payload);
      const fname = safeFileSegment(String(row.invoice_number || id)) + '.html';
      zip.file(`${ventasFolder}/${fname}`, html, { unixPermissions: 0o644 });
    }

    const expLines = [
      ['Fecha', 'Concepto', 'Categoría', `Importe (${currencyLabel})`, 'Notas', 'Adjunto'].join(','),
    ];
    let expIdx = 0;
    for (const row of expenseRows || []) {
      expIdx += 1;
      const hasFile = Boolean(row.receipt_url && String(row.receipt_url).trim());
      expLines.push(
        [
          csvEscape(String(row.date || '')),
          csvEscape(String(row.title || '')),
          csvEscape(String(row.category || '')),
          csvEscape(String(row.amount ?? '')),
          csvEscape(String(row.notes || '')),
          csvEscape(hasFile ? `gasto_${expIdx}${guessExt(row.receipt_url)}` : ''),
        ].join(',')
      );
    }
    zip.file(`${gastosFolder}/resumen_gastos.csv`, expLines.join('\n'), { unixPermissions: 0o644 });

    expIdx = 0;
    for (const row of expenseRows || []) {
      const rawPath = String(row.receipt_url || '').trim();
      if (!rawPath) continue;
      expIdx += 1;
      const ext = guessExt(rawPath);
      const bin = await downloadReceipt(supabase, rawPath);
      if (bin) {
        zip.file(`${gastosFolder}/gasto_${expIdx}${ext}`, bin, { unixPermissions: 0o644 });
      }
    }

    zip.file(
      'LEEME.txt',
      [
        `Paquete para contador — ${shopName}`,
        `Período: ${pad2(month)}/${year}`,
        '',
        `Carpeta «${ventasFolder}»: facturas emitidas (HTML imprimible desde el navegador + CSV resumen).`,
        `Carpeta «${gastosFolder}»: comprobantes de proveedor y CSV resumen.`,
        '',
        `Moneda indicada en CSV: ${currencyLabel} (según configuración del taller).`,
        '',
        'Generado desde JC ONE FIX — Panel.',
      ].join('\n'),
      { unixPermissions: 0o644 }
    );

    const blob = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    const filename = `finanzas_${year}-${pad2(month)}_${safeFileSegment(shopName)}.zip`;

    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function guessExt(pathOrUrl: string) {
  const s = pathOrUrl.toLowerCase();
  if (s.endsWith('.png')) return '.png';
  if (s.endsWith('.jpg') || s.endsWith('.jpeg')) return '.jpg';
  if (s.endsWith('.webp')) return '.webp';
  return '.pdf';
}

async function downloadReceipt(supabase: ReturnType<typeof createSupabaseServerClientFromRequest>, pathOrUrl: string) {
  const raw = pathOrUrl.trim();
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      const res = await fetch(raw);
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    } catch {
      return null;
    }
  }
  const path = raw.replace(/^\//, '');
  const { data, error } = await supabase.storage.from('expense-receipts').download(path);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

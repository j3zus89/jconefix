import type { WorkshopReportKind } from '@/lib/workshop-report-period';

export type WorkshopExpenseRow = {
  date: string;
  title: string;
  category: string;
  amount: number;
  notes?: string;
};

export type WorkshopTicketRow = {
  ticket_number: string;
  created_at: string;
  status: string;
  statusLabel: string;
  device: string;
  customer: string;
  amount: number | null;
};

export type WorkshopReportPayload = {
  shopName: string;
  periodLabel: string;
  reportKind: WorkshopReportKind;
  currencySymbol: string;
  generatedAt: string;
  /** Textos de columna/título según región (orden vs ticket). */
  repairPdfLabels: {
    detailHeading: string;
    tableColumn: string;
    truncateNote: (max: number, total: number) => string;
  };
  summary: {
    ticketsEntered: number;
    repaired: number;
    notRepaired: number;
    cancelled: number;
    inProgress: number;
    ticketRevenue: number;
    posTotal: number;
    expensesTotal: number;
  };
  expenses: WorkshopExpenseRow[];
  tickets: WorkshopTicketRow[];
};

function slugFile(s: string): string {
  return (
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'taller'
  );
}

/** Evita caracteres fuera de WinAnsi en celdas (acentos comunes en español). */
function pdfCell(s: string, maxLen = 120): string {
  const t = String(s || '')
    .replace(/\r\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}

export async function downloadWorkshopReportPdf(payload: WorkshopReportPayload): Promise<void> {
  const [{ jsPDF }, autoTableMod] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const autoTable = autoTableMod.default;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 16;

  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text('Informe del taller', margin, y);
  y += 7;
  doc.setFontSize(11);
  doc.text(pdfCell(payload.shopName, 80), margin, y);
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Periodo: ${pdfCell(payload.periodLabel, 100)}`, margin, y);
  y += 5;
  doc.text(`Generado: ${payload.generatedAt}`, margin, y);
  y += 10;

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text('Resumen', margin, y);
  y += 5;

  const sym = payload.currencySymbol;
  const s = payload.summary;
  const sumBody: string[][] = [
    ['Ingresos al taller (equipos en el periodo)', String(s.ticketsEntered)],
    ['Reparados / completados', String(s.repaired)],
    ['No reparados', String(s.notRepaired)],
    ['Cancelados', String(s.cancelled)],
    ['Aun en taller / en proceso', String(s.inProgress)],
    [`Cobrado en reparaciones (${sym})`, `${sym} ${s.ticketRevenue.toFixed(2)}`],
    [`Ventas mostrador / POS (${sym})`, `${sym} ${s.posTotal.toFixed(2)}`],
    [`Total gastos registrados (${sym})`, `${sym} ${s.expensesTotal.toFixed(2)}`],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Concepto', 'Valor']],
    body: sumBody,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [15, 118, 110], textColor: 255 },
    margin: { left: margin, right: margin },
  });
  y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 8;

  doc.setFontSize(10);
  doc.text('Gastos del periodo', margin, y);
  y += 4;

  const expBody = payload.expenses.map((e) => [
    pdfCell(e.date, 12),
    pdfCell(e.title, 40),
    pdfCell(e.category, 18),
    e.amount.toFixed(2),
    pdfCell(e.notes || '', 35),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Fecha', 'Concepto', 'Categoria', sym, 'Notas']],
    body: expBody.length ? expBody : [['—', 'Sin gastos en el periodo', '', '', '']],
    theme: 'striped',
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [51, 65, 85], textColor: 255 },
    margin: { left: margin, right: margin },
  });
  y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 8;

  doc.setFontSize(10);
  doc.text(pdfCell(payload.repairPdfLabels.detailHeading, 90), margin, y);
  y += 4;

  const maxTickets = 400;
  const ticketSlice = payload.tickets.slice(0, maxTickets);
  const ticketBody = ticketSlice.map((t) => [
    pdfCell(t.ticket_number, 14),
    pdfCell(new Date(t.created_at).toLocaleDateString('es-ES'), 18),
    pdfCell(t.statusLabel, 22),
    pdfCell(t.customer, 28),
    pdfCell(t.device, 36),
    t.amount != null ? t.amount.toFixed(2) : '—',
  ]);

  autoTable(doc, {
    startY: y,
    head: [[payload.repairPdfLabels.tableColumn, 'Fecha ingreso', 'Estado', 'Cliente', 'Equipo', sym]],
    body: ticketBody.length ? ticketBody : [['—', '—', 'Sin datos', '', '', '']],
    theme: 'striped',
    styles: { fontSize: 6.5, cellPadding: 1.2 },
    headStyles: { fillColor: [15, 118, 110], textColor: 255 },
    margin: { left: margin, right: margin },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 24 },
      2: { cellWidth: 28 },
      3: { cellWidth: 32 },
      4: { cellWidth: 42 },
      5: { cellWidth: 18, halign: 'right' },
    },
    didDrawPage: (data) => {
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Pagina ${data.pageNumber}`,
        pageW - margin - 18,
        doc.internal.pageSize.getHeight() - 8
      );
    },
  });

  if (payload.tickets.length > maxTickets) {
    const ly = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 6;
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(pdfCell(payload.repairPdfLabels.truncateNote(maxTickets, payload.tickets.length), 100), margin, ly);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const fname = `informe-taller-${slugFile(payload.shopName)}-${stamp}.pdf`;
  doc.save(fname);
}

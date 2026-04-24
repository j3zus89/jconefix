/**
 * Datos normalizados para las plantillas de etiqueta de boleto (impresion).
 */

export type TicketLabelPrintData = {
  ticketNumber: string;
  shopName: string;
  shopPhone: string;
  shopEmail: string;
  /** Linea principal de equipo (marca + modelo o tipo) */
  deviceLine: string;
  /** Trabajo / averia (recortado para etiqueta) */
  repairLine: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  /** Texto ya formateado para "Entrega / vencimiento" */
  dueLine: string;
  priorityLabel: string;
  /** Codigo corto tipo 1735 para recuadro "CODE" (plantilla profesional) */
  codeShort: string;
  /**
   * URL de seguimiento publico para el QR de la etiqueta.
   * Apunta a /check/[ticket_id] -- nunca expone datos internos.
   */
  trackingUrl: string | null;
};

function priorityToLabel(priority: string, isUrgent: boolean): string {
  if (isUrgent) return 'URGENTE';
  const p = (priority || '').toLowerCase();
  if (p === 'high' || p === 'alta') return 'Alta';
  if (p === 'low' || p === 'baja') return 'Baja';
  if (p === 'medium' || p === 'media') return 'Normal';
  return priority ? priority.charAt(0).toUpperCase() + priority.slice(1) : 'Normal';
}

function formatDueLine(dueDate: string | null | undefined): string {
  if (!dueDate) return 'Entrega: por acordar';
  try {
    const d = new Date(dueDate);
    if (Number.isNaN(d.getTime())) return 'Entrega: por acordar';
    return `Entrega: ${d.toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  } catch {
    return 'Entrega: por acordar';
  }
}

function shortCodeFromTicketNumber(ticketNumber: string): string {
  const digits = ticketNumber.replace(/\D/g, '');
  if (digits.length >= 4) return digits.slice(-4);
  const h = ticketNumber.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return String(1000 + (h % 9000)).slice(-4);
}

export function buildTicketLabelPrintData(args: {
  ticket: {
    id?: string;
    ticket_number: string;
    device_type: string;
    device_brand?: string | null;
    device_model?: string | null;
    issue_description: string;
    due_date?: string | null;
    priority: string;
    is_urgent: boolean;
    customers?: { name?: string | null; phone?: string | null; email?: string | null } | null;
  };
  shopName: string;
  shopPhone?: string;
  shopEmail?: string;
  /** Base URL del sitio (ej: https://jconefix.com.ar). Si no se pasa, se omite el QR. */
  siteOrigin?: string;
}): TicketLabelPrintData {
  const { ticket, shopName, shopPhone = '', shopEmail = '', siteOrigin } = args;
  const brandModel = [ticket.device_brand, ticket.device_model].filter(Boolean).join(' ').trim();
  const deviceLine = brandModel || ticket.device_type || 'Dispositivo';
  const repairLine = (ticket.issue_description || 'Reparacion').replace(/\s+/g, ' ').trim().slice(0, 120);
  const cust = ticket.customers;
  const customerName = cust?.name?.trim() || 'Cliente mostrador';
  const customerPhone = cust?.phone?.trim() || '--';
  const customerEmail = cust?.email?.trim() || '--';

  // URL de seguimiento publico (usa el ID del ticket si esta disponible)
  const trackingId = ticket.id || ticket.ticket_number;
  const trackingUrl =
    siteOrigin && trackingId
      ? `${siteOrigin.replace(/\/$/, '')}/check/${trackingId}`
      : null;

  return {
    ticketNumber: ticket.ticket_number || '--',
    shopName: shopName || 'Taller',
    shopPhone,
    shopEmail,
    deviceLine,
    repairLine,
    customerName,
    customerPhone,
    customerEmail,
    dueLine: formatDueLine(ticket.due_date),
    priorityLabel: priorityToLabel(ticket.priority, ticket.is_urgent),
    codeShort: shortCodeFromTicketNumber(ticket.ticket_number || ''),
    trackingUrl,
  };
}

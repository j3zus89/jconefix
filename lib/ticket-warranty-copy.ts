/**
 * Texto legal de pie de ticket (impresión térmica / vista previa).
 * Perfil Argentina: garantía legal mínima y Ley 24.240.
 */

export const TICKET_WARRANTY_FOOTNOTE_AR =
  'Reparaciones: 90 días de garantía legal en mano de obra y componentes sustituidos (Art. 12 Ley 24.240). Equipos con rastro de humedad o manipulación previa pierden toda garantía. CAMBIOS DE PANTALLA: La garantía no cubre roturas de cristal, líneas en el LCD o daños por presión/líquidos. El retiro del equipo implica la aceptación del presupuesto. Venta de accesorios: 6 meses de garantía.';

/** @deprecated Usar TICKET_WARRANTY_FOOTNOTE_AR */
export const TICKET_WARRANTY_FOOTNOTE_ES = TICKET_WARRANTY_FOOTNOTE_AR;

export function getTicketWarrantyFootnote(
  _country?: string | null | undefined,
  _currencyCode?: string | null
): string {
  return TICKET_WARRANTY_FOOTNOTE_AR;
}

/** Símbolo de moneda en ticket impreso. */
export function getTicketPrintCurrencySymbol(
  _country?: string | null | undefined,
  currencySymbolFromSettings?: string | null,
  _currencyCode?: string | null
): string {
  const sym = (currencySymbolFromSettings || '').trim();
  return sym || '$';
}

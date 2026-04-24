/**
 * Localización del panel — Argentina (ARS) únicamente.
 * Módulo central de formato de moneda, etiquetas fiscales y constantes regionales.
 */

export type OrgCountry = 'AR';
export type OrgCurrency = 'ARS';

/** Moneda del taller (siempre ARS). */
export function currencyForCountry(_country?: OrgCountry | string | null | undefined): OrgCurrency {
  return 'ARS';
}

/** Símbolo visual de moneda. */
export function currencySymbol(currency: OrgCurrency | string | null | undefined): string {
  return (currency || 'ARS').toUpperCase() === 'ARS' ? '$' : '$';
}

/** Formatea un importe en pesos argentinos. */
export function formatCurrency(
  amount: number,
  _currency: OrgCurrency | string | null | undefined,
): string {
  return '$ ' + amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Etiqueta del campo de identificación fiscal del cliente. */
export function fiscalIdLabel(_country?: OrgCountry | string | null | undefined): string {
  return 'CUIT';
}

/** Etiqueta del impuesto. */
export function vatLabel(_country?: OrgCountry | string | null | undefined): string {
  return 'IVA (AFIP/ARCA)';
}

/**
 * Porcentaje de IVA general por defecto.
 * ES → 21   |   AR → 21
 */
export function defaultVatRate(_country?: OrgCountry | string | null | undefined): number {
  return 21;
}

/** Opciones de condición frente al IVA para Argentina (AFIP/ARCA). */
export const IVA_CONDITIONS_AR = [
  'Monotributo',
  'Responsable Inscripto',
  'Exento',
  'No Responsable',
  'Consumidor Final',
] as const;

export type IvaConditionAR = (typeof IVA_CONDITIONS_AR)[number];

/** Nombre legible del país. */
export function countryLabel(_country?: OrgCountry | string | null | undefined): string {
  return '🇦🇷 Argentina';
}

/** Prefijo telefónico internacional. */
export function phonePrefix(_country?: OrgCountry | string | null | undefined): string {
  return '+54';
}

/** Emoji de bandera. */
export function phoneFlag(_country?: OrgCountry | string | null | undefined): string {
  return '🇦🇷';
}

/** Placeholder de teléfono. */
export function phonePlaceholder(_country?: OrgCountry | string | null | undefined): string {
  return '11 1234 5678';
}

/** Nombre del campo Estado/Provincia. */
export function stateLabel(_country?: OrgCountry | string | null | undefined): string {
  return 'Provincia';
}

/** Placeholder del campo Estado/Provincia. */
export function statePlaceholder(_country?: OrgCountry | string | null | undefined): string {
  return 'Ej. Buenos Aires';
}

/** Placeholder del campo Ciudad. */
export function cityPlaceholder(_country?: OrgCountry | string | null | undefined): string {
  return 'Ej. Buenos Aires';
}

/** Placeholder del código postal (CPA). */
export function postalPlaceholder(_country?: OrgCountry | string | null | undefined): string {
  return 'Ej. C1000ABC';
}

/**
 * Código postal de 5 cifras con prefijo provincial 01–52: formato típico de España.
 * En cuentas argentinas suele quedar por plantilla (p. ej. 28001 Madrid).
 */
export function isStaleSpainPostalCodeForArgentina(postal: string | null | undefined): boolean {
  const t = String(postal ?? '').trim();
  if (!/^\d{5}$/.test(t)) return false;
  const p = parseInt(t.slice(0, 2), 10);
  return p >= 1 && p <= 52;
}

/** Valor guardado por error copiando el placeholder de provincia / estado. */
export function isStaleStatePlaceholderText(
  state: string | null | undefined,
  countryIsArgentina: boolean
): boolean {
  const raw = String(state ?? '').trim();
  if (!raw) return false;
  const s = raw.toLowerCase();
  if (countryIsArgentina) {
    if (s === 'ej. buenos aires' || s === 'ejemplo buenos aires') return true;
    return /^ej\.?\s*buenos\s*aires\.?$/i.test(raw.trim());
  }
  return s === 'comunidad de madrid' || s === 'provincia / estado';
}

/**
 * Ciudades españolas habituales en datos viejos cuando el taller ya opera en Argentina (ARS).
 * Evita mostrar «Madrid» en la cuenta de un taller argentino por plantilla o migración ES→AR.
 */
export function isStaleSpainCityValueForArgentina(city: string | null | undefined): boolean {
  const t = String(city ?? '')
    .trim()
    .toLowerCase()
    .replace(/[.,;:]$/g, '');
  if (!t) return false;
  const staleEs = new Set([
    'madrid',
    'barcelona',
    'valencia',
    'sevilla',
    'bilbao',
    'zaragoza',
    'murcia',
    'palma de mallorca',
    'palma',
    'las palmas de gran canaria',
    'las palmas',
    'alicante',
    'vigo',
    'gijón',
    'gijon',
    'valladolid',
    'granada',
    'santander',
  ]);
  return staleEs.has(t);
}

/** RGPD: no aplica al perfil Argentina del panel. */
export function requiresGdprUiForOrg(_country?: OrgCountry | string | null | undefined): boolean {
  return false;
}

/**
 * Muestra checkbox/textos RGPD en crear/editar cliente.
 * Oculto si el taller es Argentina (ARS/org) o si el país del cliente es Argentina.
 */
export function shouldShowCustomerRgpdSection(
  orgCountry: OrgCountry | string | null | undefined,
  customerCountryDisplay: string | null | undefined,
): boolean {
  if (!requiresGdprUiForOrg(orgCountry)) return false;
  const cust = String(customerCountryDisplay ?? '').trim().toLowerCase();
  if (cust === 'argentina') return false;
  return true;
}

/** Valor a guardar en `customers.gdpr_consent`: si la sección no aplica, true (no bloquea guardado). */
export function gdprConsentForPersist(showRgpdSection: boolean, userChecked: boolean): boolean {
  return showRgpdSection ? userChecked : true;
}

/** País por defecto para el selector. */
export function defaultCountryName(_country?: OrgCountry | string | null | undefined): string {
  return 'Argentina';
}

/** Tipo de ID por defecto. */
export function defaultIdType(_country?: OrgCountry | string | null | undefined): string {
  return 'CUIT';
}

/** Placeholder del número de ID. */
export function idNumberPlaceholder(_country?: OrgCountry | string | null | undefined): string {
  return '20-12345678-9';
}

/**
 * Helper para componentes: devuelve los datos de locale de la org
 * a partir de los campos `country` y `currency` de la tabla `organizations`.
 */
/** Textos de UI para reparaciones en taller (orden / boleto). */
export type RepairCaseTerms = {
  nounCap: string;
  labelPrint: string;
  importeMayorCero: string;
  eligeFactura: string;
  guardadoConstanciaError: string;
  anularDevolucion: string;
  facturaOpcionalLabel: string;
  vinculaCobroHelp: string;
  registroResumenPendiente: string;
  opcionAvanzadaGarantia: string;
  vinculadaIntro: string;
  vinculadaAdj: string;
  vincularNuevoIngreso: string;
  delaySigue: string;
  /** Fila «Orden» / «Ticket» en constancias PDF */
  constanciaTicketRowLabel: string;
  pdfDetailHeading: string;
  pdfTableColumn: string;
  pdfTruncateNote: (max: number, total: number) => string;
  warrantySearchNotFound: string;
  warrantyWrongCustomer: string;
  warrantyLinkSubtitle: string;
  warrantyPreviousNumberLabel: string;
  copyDeviceFromLinked: string;
  loadLinkedFailed: string;
  openLinkedWrongCustomer: string;
  warrantyNotFoundOrg: string;
  teEscriboConEquipo: (ticketNumber: string, equipo: string) => string;
  teEscriboSolo: (ticketNumber: string) => string;
};

export function repairCaseTerms(_isArgentina?: boolean): RepairCaseTerms {
  return {
    nounCap: 'Orden',
    labelPrint: 'Etiqueta de orden',
    importeMayorCero: 'El importe de la orden debe ser mayor que 0 (estimado o final).',
    eligeFactura: 'Elige una factura de la orden o déjala sin vincular.',
    guardadoConstanciaError:
      'Guardado en la orden; no se pudo generar la constancia (revisa migraciones).',
    anularDevolucion: '¿Anular el registro de devolución en esta orden?',
    facturaOpcionalLabel: 'Factura de la orden (opcional)',
    vinculaCobroHelp: 'Vincula la devolución a un cobro previo de esta misma orden, si aplica.',
    registroResumenPendiente: 'Resumen registrado en esta orden.',
    opcionAvanzadaGarantia: 'Opción avanzada: reingreso o vínculo con otra orden (garantía)',
    vinculadaIntro: 'Esta orden está',
    vinculadaAdj: 'vinculada',
    vincularNuevoIngreso: 'esta orden',
    delaySigue: 'la orden sigue',
    constanciaTicketRowLabel: 'Orden',
    pdfDetailHeading: 'Detalle de equipos / órdenes (entraron en el periodo)',
    pdfTableColumn: 'Orden',
    pdfTruncateNote: (max, total) =>
      `(Se listan las primeras ${max} de ${total} órdenes; acorta el periodo para un PDF más corto.)`,
    warrantySearchNotFound: 'No se encontró ninguna orden con ese número en tu taller.',
    warrantyWrongCustomer:
      'Esa orden es de otro cliente. Elige el cliente correcto o revisa el número.',
    warrantyLinkSubtitle:
      'Vincula este ingreso a la orden anterior para trazabilidad (mismo equipo, fallo tras reparación, etc.).',
    warrantyPreviousNumberLabel: 'Número de orden anterior',
    copyDeviceFromLinked: 'Datos del equipo copiados desde la orden vinculada',
    loadLinkedFailed: 'No se pudo cargar esa orden.',
    openLinkedWrongCustomer:
      'Ese equipo consta con otro cliente. Cambia el cliente o abre la orden desde su ficha.',
    warrantyNotFoundOrg: 'Orden de garantía no encontrada en tu organización.',
    teEscriboConEquipo: (n, eq) => `Te escribo respecto a la orden ${n} (${eq}).`,
    teEscriboSolo: (n) => `Te escribo respecto a la orden ${n}.`,
  };
}

export function orgLocale(_org?: { country?: string | null; currency?: string | null }) {
  const country = 'AR' as OrgCountry;
  const currency = 'ARS' as OrgCurrency;
  return {
    country,
    currency,
    symbol: '$',
    isAR: true,
    isES: false,
    fiscalId: fiscalIdLabel(country),
    vat: vatLabel(country),
    format: (amount: number) => formatCurrency(amount, currency),
    phonePrefix: phonePrefix(country),
    phoneFlag: phoneFlag(country),
    phonePlaceholder: phonePlaceholder(country),
    stateLabel: stateLabel(country),
    statePlaceholder: statePlaceholder(country),
    cityPlaceholder: cityPlaceholder(country),
    postalPlaceholder: postalPlaceholder(country),
    defaultCountry: defaultCountryName(country),
    defaultIdType: defaultIdType(country),
    idNumberPlaceholder: idNumberPlaceholder(country),
  };
}

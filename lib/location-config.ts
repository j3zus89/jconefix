/**
 * Configuración regional: **toda Hispanoamérica** (LatAm + Caribe hispano) con moneda local,
 * prefijo, etiqueta fiscal y placeholders. Argentina (Mercado Pago) queda aislada en `paymentGateway`.
 *
 * Referencia de cobro internacional: PayPal en USD (29/mes) cuando `paymentGateway === 'paypal'`.
 * Si `Intl` o la moneda local falla en UI, el checkout LatAm sigue en USD vía PayPal.
 */

export type SiteMode = 'ar' | 'global';

export type PaymentGatewayPreference = 'mercadopago' | 'paypal';

/** Opción de régimen del taller o clase fiscal del cliente (valor persistido en BD). */
export type TaxRegimeOption = { value: string; label: string };

export type LocationConfig = {
  iso: string;
  /** ISO 4217 */
  currency: string;
  currencyLabel: string;
  phonePrefix: string;
  phoneFlag: string;
  fiscalIdLabel: string;
  vatLabel: string;
  addressLinePlaceholder: string;
  cityPlaceholder: string;
  stateLabel: string;
  statePlaceholder: string;
  postalPlaceholder: string;
  defaultCountryName: string;
  defaultIdType: string;
  idNumberPlaceholder: string;
  numberLocale: string;
  phoneExample: string;
  paymentGateway: PaymentGatewayPreference;
  /**
   * Régimen fiscal del **taller** (Ajustes). En AR debe ir vacío: el panel usa `IVA_CONDITIONS_AR`.
   */
  shopTaxRegimeOptions: TaxRegimeOption[];
  /** Valor por defecto al crear/cambiar país (no AR). */
  defaultShopTaxRegime: string;
  /** Opciones para clientes / tickets (incluye siempre Consumidor Final como referencia). */
  customerTaxClassOptions: TaxRegimeOption[];
  /** Predeterminado para nuevos clientes y recepción. */
  defaultCustomerTaxClass: string;
};

function cfg(p: LocationConfig): LocationConfig {
  return p;
}

/** Países sin tabla específica: régimen genérico + Consumidor Final. */
const FISCAL_GENERIC_LATAM: Pick<
  LocationConfig,
  'shopTaxRegimeOptions' | 'defaultShopTaxRegime' | 'customerTaxClassOptions' | 'defaultCustomerTaxClass'
> = {
  shopTaxRegimeOptions: [
    { value: 'regimen_general', label: 'Régimen general / gravado' },
    { value: 'exento', label: 'Exento o no responsable de IVA' },
    { value: 'otro', label: 'Otro / consultar contador' },
  ],
  defaultShopTaxRegime: 'regimen_general',
  customerTaxClassOptions: [
    { value: 'Consumidor Final', label: 'Consumidor Final' },
    { value: 'Contribuyente', label: 'Contribuyente (empresa o negocio)' },
    { value: 'Exento', label: 'Exento' },
  ],
  defaultCustomerTaxClass: 'Consumidor Final',
};

const FISCAL_AR_SENTINEL: Pick<
  LocationConfig,
  'shopTaxRegimeOptions' | 'defaultShopTaxRegime' | 'customerTaxClassOptions' | 'defaultCustomerTaxClass'
> = {
  shopTaxRegimeOptions: [],
  defaultShopTaxRegime: '',
  customerTaxClassOptions: [],
  defaultCustomerTaxClass: 'Consumidor Final',
};

const FISCAL_MX: Pick<
  LocationConfig,
  'shopTaxRegimeOptions' | 'defaultShopTaxRegime' | 'customerTaxClassOptions' | 'defaultCustomerTaxClass'
> = {
  shopTaxRegimeOptions: [
    { value: 'mx_pf_ae', label: 'Persona Física (Actividad Empresarial)' },
    { value: 'mx_resico', label: 'RESICO' },
    { value: 'mx_pm', label: 'Persona Moral' },
  ],
  defaultShopTaxRegime: 'mx_pf_ae',
  customerTaxClassOptions: [
    { value: 'Consumidor Final', label: 'Consumidor Final' },
    { value: 'mx_pf', label: 'Persona Física con obligaciones fiscales' },
    { value: 'mx_pm', label: 'Persona Moral' },
  ],
  defaultCustomerTaxClass: 'Consumidor Final',
};

const FISCAL_CL: Pick<
  LocationConfig,
  'shopTaxRegimeOptions' | 'defaultShopTaxRegime' | 'customerTaxClassOptions' | 'defaultCustomerTaxClass'
> = {
  shopTaxRegimeOptions: [
    { value: 'cl_pn_boleta', label: 'Persona Natural (Boleta)' },
    { value: 'cl_pj_factura', label: 'Persona Jurídica (Factura)' },
  ],
  defaultShopTaxRegime: 'cl_pn_boleta',
  customerTaxClassOptions: [
    { value: 'Consumidor Final', label: 'Consumidor Final' },
    { value: 'cl_pn_boleta', label: 'Persona Natural (Boleta)' },
    { value: 'cl_pj', label: 'Persona Jurídica' },
  ],
  defaultCustomerTaxClass: 'Consumidor Final',
};

const FISCAL_CO: Pick<
  LocationConfig,
  'shopTaxRegimeOptions' | 'defaultShopTaxRegime' | 'customerTaxClassOptions' | 'defaultCustomerTaxClass'
> = {
  shopTaxRegimeOptions: [
    { value: 'co_responsable_iva', label: 'Responsable de IVA' },
    { value: 'co_no_responsable', label: 'No Responsable de IVA' },
  ],
  defaultShopTaxRegime: 'co_no_responsable',
  customerTaxClassOptions: [
    { value: 'Consumidor Final', label: 'Consumidor Final' },
    { value: 'co_responsable', label: 'Responsable de IVA (negocio)' },
    { value: 'co_no_responsable', label: 'No responsable de IVA' },
  ],
  defaultCustomerTaxClass: 'Consumidor Final',
};

const FISCAL_PE: Pick<
  LocationConfig,
  'shopTaxRegimeOptions' | 'defaultShopTaxRegime' | 'customerTaxClassOptions' | 'defaultCustomerTaxClass'
> = {
  shopTaxRegimeOptions: [
    { value: 'pe_rer', label: 'Régimen Especial (RER)' },
    { value: 'pe_mype', label: 'Régimen MYPE Tributario' },
    { value: 'pe_general', label: 'Régimen General' },
  ],
  defaultShopTaxRegime: 'pe_general',
  customerTaxClassOptions: [
    { value: 'Consumidor Final', label: 'Consumidor Final' },
    { value: 'pe_domiciliado', label: 'RUC — operación gravada' },
    { value: 'pe_export', label: 'No domiciliado / especial' },
  ],
  defaultCustomerTaxClass: 'Consumidor Final',
};

const FISCAL_UY: Pick<
  LocationConfig,
  'shopTaxRegimeOptions' | 'defaultShopTaxRegime' | 'customerTaxClassOptions' | 'defaultCustomerTaxClass'
> = {
  shopTaxRegimeOptions: [
    { value: 'uy_monotributo', label: 'Monotributo' },
    { value: 'uy_iva_general', label: 'IVA General' },
    { value: 'uy_pequena_empresa', label: 'Pequeña Empresa' },
  ],
  defaultShopTaxRegime: 'uy_monotributo',
  customerTaxClassOptions: [
    { value: 'Consumidor Final', label: 'Consumidor Final' },
    { value: 'uy_monotributo', label: 'Monotributo' },
    { value: 'uy_iva_general', label: 'IVA General (cliente empresa)' },
  ],
  defaultCustomerTaxClass: 'Consumidor Final',
};

/** 🇲🇽 Norte y Centroamérica */
/** Campo fiscal en formularios: **RFC** (no CUIT; CUIT solo en AR). */
const MX = cfg({
  iso: 'MX',
  currency: 'MXN',
  currencyLabel: 'Peso mexicano',
  phonePrefix: '+52',
  phoneFlag: '🇲🇽',
  fiscalIdLabel: 'RFC',
  vatLabel: 'IVA',
  addressLinePlaceholder: 'Ej. Av. Reforma 222, Colonia Juárez',
  cityPlaceholder: 'Ej. Ciudad de México',
  stateLabel: 'Estado',
  statePlaceholder: 'Ej. CDMX',
  postalPlaceholder: 'Ej. 06600 (5 dígitos)',
  defaultCountryName: 'México',
  defaultIdType: 'RFC',
  idNumberPlaceholder: 'XAXX010101000',
  numberLocale: 'es-MX',
  phoneExample: '55 1234 5678',
  paymentGateway: 'paypal',
  ...FISCAL_MX,
});

const GT = cfg({
  iso: 'GT',
  currency: 'GTQ',
  currencyLabel: 'Quetzal',
  phonePrefix: '+502',
  phoneFlag: '🇬🇹',
  fiscalIdLabel: 'NIT',
  vatLabel: 'IVA',
  addressLinePlaceholder: 'Ej. Zona 1, 12 Av. 8-45',
  cityPlaceholder: 'Ej. Ciudad de Guatemala',
  stateLabel: 'Departamento',
  statePlaceholder: 'Ej. Guatemala',
  postalPlaceholder: 'Ej. 01001',
  defaultCountryName: 'Guatemala',
  defaultIdType: 'NIT',
  idNumberPlaceholder: '12345678-9',
  numberLocale: 'es-GT',
  phoneExample: '5123 4567',
  paymentGateway: 'paypal',
  ...FISCAL_GENERIC_LATAM,
});

const SV = cfg({
  iso: 'SV',
  currency: 'USD',
  currencyLabel: 'Dólar estadounidense',
  phonePrefix: '+503',
  phoneFlag: '🇸🇻',
  fiscalIdLabel: 'NIT',
  vatLabel: 'IVA',
  addressLinePlaceholder: 'Ej. Colonia Escalón, Calle El Mirador 123',
  cityPlaceholder: 'Ej. San Salvador',
  stateLabel: 'Departamento',
  statePlaceholder: 'Ej. San Salvador',
  postalPlaceholder: 'Ej. 1101',
  defaultCountryName: 'El Salvador',
  defaultIdType: 'NIT',
  idNumberPlaceholder: '0614-123456-101-1',
  numberLocale: 'es-SV',
  phoneExample: '7123 4567',
  paymentGateway: 'paypal',
  ...FISCAL_GENERIC_LATAM,
});

const HN = cfg({
  iso: 'HN',
  currency: 'HNL',
  currencyLabel: 'Lempira',
  phonePrefix: '+504',
  phoneFlag: '🇭🇳',
  fiscalIdLabel: 'RTN',
  vatLabel: 'ISV',
  addressLinePlaceholder: 'Ej. Col. Palmira, Blvd. Morazán',
  cityPlaceholder: 'Ej. Tegucigalpa',
  stateLabel: 'Departamento',
  statePlaceholder: 'Ej. Francisco Morazán',
  postalPlaceholder: 'Ej. 11101',
  defaultCountryName: 'Honduras',
  defaultIdType: 'RTN',
  idNumberPlaceholder: '0801-1990-12345',
  numberLocale: 'es-HN',
  phoneExample: '9988 7766',
  paymentGateway: 'paypal',
  ...FISCAL_GENERIC_LATAM,
});

const NI = cfg({
  iso: 'NI',
  currency: 'NIO',
  currencyLabel: 'Córdoba',
  phonePrefix: '+505',
  phoneFlag: '🇳🇮',
  fiscalIdLabel: 'RUC',
  vatLabel: 'IVA',
  addressLinePlaceholder: 'Ej. De la Rotonda 500 m al este',
  cityPlaceholder: 'Ej. Managua',
  stateLabel: 'Departamento',
  statePlaceholder: 'Ej. Managua',
  postalPlaceholder: 'Ej. 12000',
  defaultCountryName: 'Nicaragua',
  defaultIdType: 'RUC',
  idNumberPlaceholder: 'J0310000001234',
  numberLocale: 'es-NI',
  phoneExample: '8888 1234',
  paymentGateway: 'paypal',
  ...FISCAL_GENERIC_LATAM,
});

const CR = cfg({
  iso: 'CR',
  currency: 'CRC',
  currencyLabel: 'Colón costarricense',
  phonePrefix: '+506',
  phoneFlag: '🇨🇷',
  fiscalIdLabel: 'Cédula jurídica',
  vatLabel: 'IVA',
  addressLinePlaceholder: 'Ej. San José, Barrio Escalante, de la torre 100 m sur',
  cityPlaceholder: 'Ej. San José',
  stateLabel: 'Provincia',
  statePlaceholder: 'Ej. San José',
  postalPlaceholder: 'Ej. 10101',
  defaultCountryName: 'Costa Rica',
  defaultIdType: 'Cédula jurídica',
  idNumberPlaceholder: '3-101-123456',
  numberLocale: 'es-CR',
  phoneExample: '8888 1234',
  paymentGateway: 'paypal',
  ...FISCAL_GENERIC_LATAM,
});

const PA = cfg({
  iso: 'PA',
  currency: 'PAB',
  currencyLabel: 'Balboa',
  phonePrefix: '+507',
  phoneFlag: '🇵🇦',
  fiscalIdLabel: 'RUC',
  vatLabel: 'ITBMS',
  addressLinePlaceholder: 'Ej. Calle 50, Urb. Obarrio, Edificio…',
  cityPlaceholder: 'Ej. Ciudad de Panamá',
  stateLabel: 'Provincia',
  statePlaceholder: 'Ej. Panamá',
  postalPlaceholder: 'Ej. 0801',
  defaultCountryName: 'Panamá',
  defaultIdType: 'RUC',
  idNumberPlaceholder: '1555666677-2-2015 DV 40',
  numberLocale: 'es-PA',
  phoneExample: '6123 4567',
  paymentGateway: 'paypal',
  ...FISCAL_GENERIC_LATAM,
});

/** 🇨🇺 Caribe hispano */
const CU = cfg({
  iso: 'CU',
  currency: 'CUP',
  currencyLabel: 'Peso cubano',
  phonePrefix: '+53',
  phoneFlag: '🇨🇺',
  fiscalIdLabel: 'NIT',
  vatLabel: 'Impuestos',
  addressLinePlaceholder: 'Ej. Vedado, Calle 23 e/ H e I, apto…',
  cityPlaceholder: 'Ej. La Habana',
  stateLabel: 'Provincia',
  statePlaceholder: 'Ej. La Habana',
  postalPlaceholder: 'Ej. 10400',
  defaultCountryName: 'Cuba',
  defaultIdType: 'NIT',
  idNumberPlaceholder: '12345678-9',
  numberLocale: 'es-CU',
  phoneExample: '5 1234567',
  paymentGateway: 'paypal',
  ...FISCAL_GENERIC_LATAM,
});

const DO = cfg({
  iso: 'DO',
  currency: 'DOP',
  currencyLabel: 'Peso dominicano',
  phonePrefix: '+1',
  phoneFlag: '🇩🇴',
  fiscalIdLabel: 'RNC',
  vatLabel: 'ITBIS',
  addressLinePlaceholder: 'Ej. Av. Winston Churchill 1099',
  cityPlaceholder: 'Ej. Santo Domingo',
  stateLabel: 'Provincia',
  statePlaceholder: 'Ej. Distrito Nacional',
  postalPlaceholder: 'Ej. 10101',
  defaultCountryName: 'República Dominicana',
  defaultIdType: 'RNC',
  idNumberPlaceholder: '131-12345-6',
  numberLocale: 'es-DO',
  phoneExample: '809 555 1234',
  paymentGateway: 'paypal',
  ...FISCAL_GENERIC_LATAM,
});

const PR = cfg({
  iso: 'PR',
  currency: 'USD',
  currencyLabel: 'Dólar estadounidense',
  phonePrefix: '+1',
  phoneFlag: '🇵🇷',
  fiscalIdLabel: 'EIN / ID fiscal',
  vatLabel: 'Impuestos',
  addressLinePlaceholder: 'Ej. Calle Loíza 1234, Santurce',
  cityPlaceholder: 'Ej. San Juan',
  stateLabel: 'Municipio',
  statePlaceholder: 'Ej. San Juan',
  postalPlaceholder: 'Ej. 00907 (ZIP)',
  defaultCountryName: 'Puerto Rico',
  defaultIdType: 'EIN',
  idNumberPlaceholder: '12-3456789',
  numberLocale: 'es-PR',
  phoneExample: '787 555 1234',
  paymentGateway: 'paypal',
  ...FISCAL_GENERIC_LATAM,
});

/** 🇨🇴 Sudamérica */
const CO = cfg({
  iso: 'CO',
  currency: 'COP',
  currencyLabel: 'Peso colombiano',
  phonePrefix: '+57',
  phoneFlag: '🇨🇴',
  fiscalIdLabel: 'NIT',
  vatLabel: 'IVA',
  addressLinePlaceholder: 'Ej. Carrera 7 #71-21, Oficina…',
  cityPlaceholder: 'Ej. Bogotá',
  stateLabel: 'Departamento',
  statePlaceholder: 'Ej. Cundinamarca',
  postalPlaceholder: 'Ej. 110111',
  defaultCountryName: 'Colombia',
  defaultIdType: 'NIT',
  idNumberPlaceholder: '900.123.456-1',
  numberLocale: 'es-CO',
  phoneExample: '300 123 4567',
  paymentGateway: 'paypal',
  ...FISCAL_CO,
});

const VE = cfg({
  iso: 'VE',
  currency: 'VES',
  currencyLabel: 'Bolívar',
  phonePrefix: '+58',
  phoneFlag: '🇻🇪',
  fiscalIdLabel: 'RIF',
  vatLabel: 'IVA',
  addressLinePlaceholder: 'Ej. Av. Francisco de Miranda, Chacao',
  cityPlaceholder: 'Ej. Caracas',
  stateLabel: 'Estado',
  statePlaceholder: 'Ej. Miranda',
  postalPlaceholder: 'Ej. 1010',
  defaultCountryName: 'Venezuela',
  defaultIdType: 'RIF',
  idNumberPlaceholder: 'J-12345678-9',
  numberLocale: 'es-VE',
  phoneExample: '412 1234567',
  paymentGateway: 'paypal',
  ...FISCAL_GENERIC_LATAM,
});

const EC = cfg({
  iso: 'EC',
  currency: 'USD',
  currencyLabel: 'Dólar estadounidense',
  phonePrefix: '+593',
  phoneFlag: '🇪🇨',
  fiscalIdLabel: 'RUC',
  vatLabel: 'IVA',
  addressLinePlaceholder: 'Ej. Av. Amazonas N34-123 y República',
  cityPlaceholder: 'Ej. Quito',
  stateLabel: 'Provincia',
  statePlaceholder: 'Ej. Pichincha',
  postalPlaceholder: 'Ej. 170135',
  defaultCountryName: 'Ecuador',
  defaultIdType: 'RUC',
  idNumberPlaceholder: '1790012345001',
  numberLocale: 'es-EC',
  phoneExample: '99 123 4567',
  paymentGateway: 'paypal',
  ...FISCAL_GENERIC_LATAM,
});

const PE = cfg({
  iso: 'PE',
  currency: 'PEN',
  currencyLabel: 'Sol',
  phonePrefix: '+51',
  phoneFlag: '🇵🇪',
  fiscalIdLabel: 'RUC',
  vatLabel: 'IGV',
  addressLinePlaceholder: 'Ej. Jr. de la Unión 621, Cercado de Lima',
  cityPlaceholder: 'Ej. Lima',
  stateLabel: 'Departamento',
  statePlaceholder: 'Ej. Lima',
  postalPlaceholder: 'Ej. 15001',
  defaultCountryName: 'Perú',
  defaultIdType: 'RUC',
  idNumberPlaceholder: '20XXXXXXXX9',
  numberLocale: 'es-PE',
  phoneExample: '987 654 321',
  paymentGateway: 'paypal',
  ...FISCAL_PE,
});

const BO = cfg({
  iso: 'BO',
  currency: 'BOB',
  currencyLabel: 'Boliviano',
  phonePrefix: '+591',
  phoneFlag: '🇧🇴',
  fiscalIdLabel: 'NIT',
  vatLabel: 'IVA',
  addressLinePlaceholder: 'Ej. Av. Arce 2345, Sopocachi',
  cityPlaceholder: 'Ej. La Paz',
  stateLabel: 'Departamento',
  statePlaceholder: 'Ej. La Paz',
  postalPlaceholder: 'Ej. 0000',
  defaultCountryName: 'Bolivia',
  defaultIdType: 'NIT',
  idNumberPlaceholder: '123456789',
  numberLocale: 'es-BO',
  phoneExample: '765 43210',
  paymentGateway: 'paypal',
  ...FISCAL_GENERIC_LATAM,
});

const PY = cfg({
  iso: 'PY',
  currency: 'PYG',
  currencyLabel: 'Guaraní',
  phonePrefix: '+595',
  phoneFlag: '🇵🇾',
  fiscalIdLabel: 'RUC',
  vatLabel: 'IVA',
  addressLinePlaceholder: 'Ej. Av. España 1234, Barrio…',
  cityPlaceholder: 'Ej. Asunción',
  stateLabel: 'Departamento',
  statePlaceholder: 'Ej. Central',
  postalPlaceholder: 'Ej. 1120',
  defaultCountryName: 'Paraguay',
  defaultIdType: 'RUC',
  idNumberPlaceholder: '80012345-1',
  numberLocale: 'es-PY',
  phoneExample: '981 123456',
  paymentGateway: 'paypal',
  ...FISCAL_GENERIC_LATAM,
});

/** Campo fiscal: **RUT** (mismo término que UY; CUIT / CUIL solo en AR). */
const CL = cfg({
  iso: 'CL',
  currency: 'CLP',
  currencyLabel: 'Peso chileno',
  phonePrefix: '+56',
  phoneFlag: '🇨🇱',
  fiscalIdLabel: 'RUT',
  vatLabel: 'IVA',
  addressLinePlaceholder: "Ej. Av. Libertador Bernardo O'Higgins 1234",
  cityPlaceholder: 'Ej. Santiago',
  stateLabel: 'Región',
  statePlaceholder: 'Ej. Metropolitana',
  postalPlaceholder: 'Ej. 8320000',
  defaultCountryName: 'Chile',
  defaultIdType: 'RUT',
  idNumberPlaceholder: '12.345.678-9',
  numberLocale: 'es-CL',
  phoneExample: '9 8765 4321',
  paymentGateway: 'paypal',
  ...FISCAL_CL,
});

const UY = cfg({
  iso: 'UY',
  currency: 'UYU',
  currencyLabel: 'Peso uruguayo',
  phonePrefix: '+598',
  phoneFlag: '🇺🇾',
  fiscalIdLabel: 'RUT',
  vatLabel: 'IVA',
  addressLinePlaceholder: 'Ej. Bulevar Artigas 1234, Pocitos',
  cityPlaceholder: 'Ej. Montevideo',
  stateLabel: 'Departamento',
  statePlaceholder: 'Ej. Montevideo',
  postalPlaceholder: 'Ej. 11300',
  defaultCountryName: 'Uruguay',
  defaultIdType: 'RUT',
  idNumberPlaceholder: '12345678',
  numberLocale: 'es-UY',
  phoneExample: '94 123 456',
  paymentGateway: 'paypal',
  ...FISCAL_UY,
});

const AR = cfg({
  iso: 'AR',
  currency: 'ARS',
  currencyLabel: 'Peso argentino',
  phonePrefix: '+54',
  phoneFlag: '🇦🇷',
  fiscalIdLabel: 'CUIT / CUIL',
  vatLabel: 'IVA (ARCA/AFIP)',
  addressLinePlaceholder: 'Ej. Av. Corrientes 1234, Piso 2',
  cityPlaceholder: 'Ej. Buenos Aires',
  stateLabel: 'Provincia',
  statePlaceholder: 'Ej. Buenos Aires',
  postalPlaceholder: 'Ej. C1000ABC',
  defaultCountryName: 'Argentina',
  defaultIdType: 'CUIT',
  idNumberPlaceholder: '20-12345678-9',
  numberLocale: 'es-AR',
  phoneExample: '11 1234 5678',
  paymentGateway: 'mercadopago',
  ...FISCAL_AR_SENTINEL,
});

const FALLBACK_LATAM: LocationConfig = {
  iso: 'XX',
  currency: 'USD',
  currencyLabel: 'Dólar estadounidense (referencia)',
  phonePrefix: '+1',
  phoneFlag: '🌎',
  fiscalIdLabel: 'ID fiscal',
  vatLabel: 'Impuestos',
  addressLinePlaceholder: 'Ej. Calle principal 100, Colonia Centro',
  cityPlaceholder: 'Ej. Ciudad',
  stateLabel: 'Estado / provincia',
  statePlaceholder: 'Ej. Estado',
  postalPlaceholder: 'Ej. código postal',
  defaultCountryName: '—',
  defaultIdType: 'ID fiscal',
  idNumberPlaceholder: '—',
  numberLocale: 'es-419',
  phoneExample: '—',
  paymentGateway: 'paypal',
  ...FISCAL_GENERIC_LATAM,
};

/** Todas las configuraciones por ISO (19 jurisdicciones hispanohablantes objetivo). */
const BY_ISO: Record<string, LocationConfig> = {
  AR,
  MX,
  GT,
  SV,
  HN,
  NI,
  CR,
  PA,
  CU,
  DO,
  PR,
  CO,
  VE,
  EC,
  PE,
  BO,
  PY,
  CL,
  UY,
};

/** ISO alpha-2 → orden alfabético por nombre para `<select>`. */
export function spanishLatAmCountriesForSelect(): { iso: string; label: string }[] {
  return Object.values(BY_ISO)
    .map((c) => ({ iso: c.iso, label: c.defaultCountryName }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
}

export function listConfiguredCountryCodes(): string[] {
  return Object.keys(BY_ISO).sort();
}

/** Resuelve nombre visible del taller → ISO (para guardar en `organizations.country`). */
export function isoFromSpanishCountryName(name: string | null | undefined): string | null {
  const t = String(name ?? '').trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  for (const c of Object.values(BY_ISO)) {
    if (c.defaultCountryName.toLowerCase() === lower) return c.iso;
  }
  return null;
}

/** Huso horario principal por país (un valor por defecto al cambiar país/moneda). */
export function primaryTimezoneForCountry(iso: string | null | undefined): string {
  const k = String(iso ?? '')
    .trim()
    .toUpperCase();
  const map: Record<string, string> = {
    AR: 'America/Argentina/Buenos_Aires',
    MX: 'America/Mexico_City',
    GT: 'America/Guatemala',
    SV: 'America/El_Salvador',
    HN: 'America/Tegucigalpa',
    NI: 'America/Managua',
    CR: 'America/Costa_Rica',
    PA: 'America/Panama',
    CU: 'America/Havana',
    DO: 'America/Santo_Domingo',
    PR: 'America/Puerto_Rico',
    CO: 'America/Bogota',
    VE: 'America/Caracas',
    EC: 'America/Guayaquil',
    PE: 'America/Lima',
    BO: 'America/La_Paz',
    PY: 'America/Asuncion',
    CL: 'America/Santiago',
    UY: 'America/Montevideo',
  };
  return map[k] ?? 'America/Mexico_City';
}

/**
 * Opciones de huso para el taller (sin duplicados): todas las zonas `America/*` usadas arriba
 * más variantes útiles (Argentina regional, México).
 */
export const SHOP_TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: 'America/Mexico_City', label: 'GMT −06:00 — México (Ciudad de México)' },
  { value: 'America/Guatemala', label: 'GMT −06:00 — Guatemala' },
  { value: 'America/El_Salvador', label: 'GMT −06:00 — El Salvador' },
  { value: 'America/Tegucigalpa', label: 'GMT −06:00 — Honduras' },
  { value: 'America/Managua', label: 'GMT −06:00 — Nicaragua' },
  { value: 'America/Costa_Rica', label: 'GMT −06:00 — Costa Rica' },
  { value: 'America/Panama', label: 'GMT −05:00 — Panamá' },
  { value: 'America/Havana', label: 'GMT −05:00 — Cuba' },
  { value: 'America/Santo_Domingo', label: 'GMT −04:00 — República Dominicana' },
  { value: 'America/Puerto_Rico', label: 'GMT −04:00 — Puerto Rico' },
  { value: 'America/Bogota', label: 'GMT −05:00 — Colombia' },
  { value: 'America/Caracas', label: 'GMT −04:00 — Venezuela' },
  { value: 'America/Guayaquil', label: 'GMT −05:00 — Ecuador' },
  { value: 'America/Lima', label: 'GMT −05:00 — Perú' },
  { value: 'America/La_Paz', label: 'GMT −04:00 — Bolivia' },
  { value: 'America/Asuncion', label: 'GMT −04:00 — Paraguay' },
  { value: 'America/Santiago', label: 'GMT −04:00 — Chile' },
  { value: 'America/Montevideo', label: 'GMT −03:00 — Uruguay' },
  { value: 'America/Argentina/Buenos_Aires', label: 'GMT −03:00 — Argentina (Buenos Aires)' },
  { value: 'America/Argentina/Cordoba', label: 'GMT −03:00 — Argentina (Córdoba)' },
  { value: 'America/Argentina/Mendoza', label: 'GMT −03:00 — Argentina (Mendoza)' },
];

export function getLocationConfig(iso: string | null | undefined): LocationConfig {
  const k = String(iso ?? '')
    .trim()
    .toUpperCase();
  if (k && BY_ISO[k]) return BY_ISO[k];
  return { ...FALLBACK_LATAM, iso: k || 'XX' };
}

export function isArgentinaIso(iso: string | null | undefined): boolean {
  return String(iso ?? '')
    .trim()
    .toUpperCase() === 'AR';
}

/**
 * Modo público del sitio según dominio.
 * - `.com.ar` → Argentina (ARS / Mercado Pago).
 * - Resto (incl. localhost sin override): **global** (USD / PayPal / LatAm) — nunca asumir Argentina sin dominio .com.ar.
 * - `NEXT_PUBLIC_DEFAULT_SITE_MODE=ar` fuerza modo AR solo en desarrollo local si lo necesitás.
 */
export function resolveSiteModeFromHost(hostname: string): SiteMode {
  const h = hostname.split(':')[0]?.toLowerCase() ?? '';
  if (!h || h === 'localhost' || h === '127.0.0.1' || h.endsWith('.local')) {
    const env = process.env.NEXT_PUBLIC_DEFAULT_SITE_MODE?.trim().toLowerCase();
    if (env === 'ar') return 'ar';
    return 'global';
  }
  if (h.endsWith('.com.ar') || h === 'jconefix.com.ar' || h === 'www.jconefix.com.ar') {
    return 'ar';
  }
  if (h === 'jconefix.com' || h === 'www.jconefix.com') {
    return 'global';
  }
  // Preview Vercel u otros hosts: internacional por defecto (evita ARS/Argentina fuera de .com.ar).
  return 'global';
}

/** Conjunto para geo IP: Hispanoamérica + Brasil (turistas); sin Brasil en BY_ISO. */
const LATAM_GEO_ISO = new Set([
  ...Object.keys(BY_ISO),
  'BR',
]);

export const LATAM_PAYPAL_ISOS = new Set(
  Object.keys(BY_ISO).filter((iso) => iso !== 'AR')
);

/**
 * Cabecera Vercel `x-vercel-ip-country` → código de organización sugerido.
 */
export function normalizeGeoCountryToOrgCountry(
  ipCountry: string | null | undefined,
  siteMode: SiteMode
): string {
  const raw = String(ipCountry ?? '')
    .trim()
    .toUpperCase();
  if (siteMode === 'ar') return 'AR';
  if (raw && BY_ISO[raw]) return raw;
  if (raw && LATAM_GEO_ISO.has(raw)) return raw;
  return 'MX';
}

export const SITE_MODE_COOKIE = 'jc_site_mode';
export const REGION_COOKIE = 'jc_region';

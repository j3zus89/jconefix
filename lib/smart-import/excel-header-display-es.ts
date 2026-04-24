import { normalizeHeaderKey } from '@/lib/smart-import/normalize';

/**
 * Etiqueta en español (Argentina) para mostrar cabeceras típicas de export en inglés.
 * El valor real del Excel no cambia: solo la UI del panel.
 */
const KNOWN: Record<string, string> = {
  // Nombre / contacto
  firstname: 'Nombre',
  lastname: 'Apellido',
  first: 'Nombre',
  last: 'Apellido',
  firstname1: 'Nombre',
  lastname1: 'Apellido',
  'first name': 'Nombre',
  'last name': 'Apellido',
  fullname: 'Nombre completo',
  'full name': 'Nombre completo',
  name: 'Nombre',
  contact: 'Contacto',
  contactname: 'Nombre de contacto',
  'contact name': 'Nombre de contacto',
  customer: 'Cliente',
  customername: 'Nombre del cliente',
  'customer name': 'Nombre del cliente',
  company: 'Empresa / razón social',
  organization: 'Organización',
  title: 'Título / tratamiento',
  salutation: 'Saludo',

  // Comunicación
  email: 'Correo electrónico',
  'e mail': 'Correo electrónico',
  mail: 'Correo electrónico',
  phone: 'Teléfono',
  phonenumber: 'Teléfono',
  'phone number': 'Teléfono',
  telephone: 'Teléfono',
  tel: 'Teléfono',
  homephone: 'Teléfono fijo',
  workphone: 'Teléfono laboral',
  mobile: 'Celular',
  cellphone: 'Celular',
  'cell phone': 'Celular',
  cellphone1: 'Celular',
  whatsapp: 'WhatsApp',
  fax: 'Fax',

  // Dirección
  address: 'Dirección',
  address1: 'Dirección (línea 1)',
  address2: 'Dirección (línea 2)',
  address3: 'Dirección (línea 3)',
  street: 'Calle',
  street1: 'Calle',
  street2: 'Calle (línea 2)',
  line1: 'Línea 1',
  line2: 'Línea 2',
  addressline1: 'Dirección (línea 1)',
  addressline2: 'Dirección (línea 2)',
  addressline3: 'Dirección (línea 3)',
  city: 'Ciudad',
  town: 'Localidad',
  state: 'Provincia / estado',
  province: 'Provincia',
  region: 'Región',
  county: 'Partido / condado',
  postcode: 'Código postal',
  postalcode: 'Código postal',
  'postal code': 'Código postal',
  zip: 'Código postal',
  zipcode: 'Código postal',
  country: 'País',
  countrycode: 'Código de país',

  // Identificadores
  code: 'Código',
  customercode: 'Código de cliente',
  'customer code': 'Código de cliente',
  id: 'Identificador',
  externalid: 'ID externo',
  'external id': 'ID externo',
  dni: 'DNI',
  taxid: 'CUIT / identificación fiscal',
  'tax id': 'CUIT / identificación fiscal',
  vat: 'Condición fiscal / IVA',
  notes: 'Notas',
  comments: 'Comentarios',
  description: 'Descripción',
  remark: 'Observación',
  remarks: 'Observaciones',

  // Ticket / reparación (cabeceras en inglés frecuentes)
  ticket: 'Boleto / orden',
  ticketnumber: 'Número de boleto',
  'ticket number': 'Número de boleto',
  ticketid: 'Identificador de boleto',
  order: 'Orden',
  ordernumber: 'Número de orden',
  status: 'Estado',
  priority: 'Prioridad',
  brand: 'Marca',
  model: 'Modelo',
  device: 'Equipo',
  devicetype: 'Tipo de equipo',
  serial: 'Número de serie',
  serialnumber: 'Número de serie',
  'serial number': 'Número de serie',
  imei: 'IMEI',
  issue: 'Problema reportado',
  problem: 'Problema',
  diagnosis: 'Diagnóstico',
  estimated: 'Costo estimado',
  estimatedcost: 'Costo estimado',
  'estimated cost': 'Costo estimado',
  finalcost: 'Costo final',
  'final cost': 'Costo final',
  total: 'Total',
  amount: 'Importe',
  created: 'Fecha de alta',
  createdat: 'Fecha de creación',
  updated: 'Fecha de actualización',
  duedate: 'Fecha límite',
  assigned: 'Asignado a',
  technician: 'Técnico',

  // Inventario / producto
  sku: 'SKU / código',
  product: 'Producto',
  quantity: 'Cantidad',
  price: 'Precio',
  cost: 'Costo',
};

/** Texto amigable para listas y desplegables de mapeo (panel). */
export function excelColumnLabelEs(raw: string): string {
  const t = raw.trim();
  if (!t) return '(vacío)';
  const synthetic = /^__jc_col_(\d+)$/i.exec(t);
  if (synthetic) {
    return `Columna ${Number(synthetic[1]) + 1}`;
  }
  const k = normalizeHeaderKey(t);
  if (KNOWN[k]) return KNOWN[k];
  // Cabeceras tipo "AddressLine1" → addressline1 no está; intentar sin dígitos finales
  const noTrailDigit = k.replace(/\d+$/g, '').trim();
  if (noTrailDigit && noTrailDigit !== k && KNOWN[noTrailDigit]) {
    return KNOWN[noTrailDigit];
  }
  return t;
}

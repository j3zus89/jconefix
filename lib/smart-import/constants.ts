/** Filas máximas por importación (hoja 1). Mantiene el cuerpo JSON razonable para la API. */
export const SMART_IMPORT_MAX_ROWS = 1000;

export type SmartImportMode = 'customers_only' | 'customers_and_tickets';

export type TargetFieldId =
  | 'customer_name'
  | 'customer_email'
  | 'customer_phone'
  | 'customer_organization'
  | 'customer_address'
  | 'customer_city'
  | 'customer_state'
  | 'customer_postal_code'
  | 'customer_country'
  | 'customer_id_number'
  | 'customer_notes'
  | 'ticket_number'
  | 'device_type'
  | 'device_brand'
  | 'device_model'
  | 'device_category'
  | 'device_screen_inches'
  | 'serial_number'
  | 'imei'
  | 'issue_description'
  | 'status'
  | 'priority'
  | 'task_type'
  | 'estimated_cost'
  | 'final_cost'
  | 'notes'
  | 'diagnostic_notes';

export const CUSTOMER_TARGET_FIELDS: { id: TargetFieldId; label: string; required?: boolean }[] = [
  { id: 'customer_name', label: 'Cliente (nombre completo)', required: true },
  { id: 'customer_email', label: 'Correo electrónico' },
  { id: 'customer_phone', label: 'Teléfono' },
  { id: 'customer_organization', label: 'Empresa / organización' },
  { id: 'customer_address', label: 'Dirección' },
  { id: 'customer_city', label: 'Ciudad' },
  { id: 'customer_state', label: 'Provincia / estado' },
  { id: 'customer_postal_code', label: 'Código postal' },
  { id: 'customer_country', label: 'País' },
  { id: 'customer_id_number', label: 'Documento / DNI' },
  { id: 'customer_notes', label: 'Notas del cliente' },
];

export const TICKET_TARGET_FIELDS: { id: TargetFieldId; label: string }[] = [
  { id: 'ticket_number', label: 'Número de orden / boleto (histórico)' },
  { id: 'device_type', label: 'Tipo de equipo (texto libre)' },
  { id: 'device_brand', label: 'Marca' },
  { id: 'device_model', label: 'Modelo' },
  { id: 'device_category', label: 'Categoría (p. ej. celulares)' },
  { id: 'device_screen_inches', label: 'Pulgadas (Smart TV)' },
  { id: 'serial_number', label: 'Número de serie' },
  { id: 'imei', label: 'IMEI' },
  {
    id: 'issue_description',
    label: 'Descripción del problema / trabajo (requerida si la fila trae datos de la orden)',
  },
  { id: 'status', label: 'Estado del boleto' },
  { id: 'priority', label: 'Prioridad' },
  { id: 'task_type', label: 'Tipo de tarea / canal' },
  { id: 'estimated_cost', label: 'Costo estimado' },
  { id: 'final_cost', label: 'Costo final' },
  { id: 'notes', label: 'Notas del boleto' },
  { id: 'diagnostic_notes', label: 'Diagnóstico / notas técnicas' },
];

/** Sinónimos por campo destino (cabeceras ya normalizadas con `normalizeHeaderKey`). */
export const TARGET_SYNONYMS: Record<TargetFieldId, string[]> = {
  customer_name: [
    'nombre',
    'nombre del cliente',
    'nombre cliente',
    'cliente',
    'titular',
    'name',
    'fullname',
    'full name',
    'firstname',
    'first name',
    'lastname',
    'last name',
    'nombre completo',
    'contacto',
    'customer name',
  ],
  customer_email: ['email', 'correo', 'e mail', 'mail'],
  customer_phone: [
    'telefono',
    'teléfono',
    'telefono movil',
    'teléfono móvil',
    'phone',
    'telephone',
    'movil',
    'móvil',
    'celular',
    'mobile',
    'cell',
    'cellphone',
    'whatsapp',
    'tlf',
  ],
  customer_organization: [
    'empresa',
    'organizacion',
    'organización',
    'compania',
    'compañía',
    'company',
    'negocio',
    'fantasia',
    'nombre fantasia',
    'razon social',
    'razón social',
    'razon social cliente',
    'business',
    'organization',
  ],
  customer_address: [
    'direccion',
    'dirección',
    'address',
    'address1',
    'address 1',
    'address2',
    'street',
    'line1',
    'calle',
  ],
  customer_city: ['ciudad', 'city', 'localidad', 'poblacion', 'población', 'town', 'suburb'],
  customer_state: [
    'provincia',
    'province',
    'region',
    'estado cliente',
    'state province',
    'partido',
    'departamento',
  ],
  customer_postal_code: [
    'codigo postal',
    'código postal',
    'cp',
    'zip',
    'zipcode',
    'zip code',
    'postal',
    'postal code',
  ],
  customer_country: ['pais', 'país', 'country', 'nacion', 'nación'],
  customer_id_number: [
    'dni',
    'documento',
    'cedula',
    'cédula',
    'nif',
    'cuit',
    'id number',
    'idnumber',
    'code',
    'customer code',
    'tax id',
  ],
  customer_notes: ['notas cliente', 'observaciones cliente', 'comentarios cliente'],
  ticket_number: [
    'boleto',
    'ticket',
    'orden',
    'numero boleto',
    'número boleto',
    'n orden',
    'n° orden',
    'nro orden',
    'número orden',
    'numero orden',
    'orden de trabajo',
    'orden trabajo',
    'ot',
    'nro ot',
    'n° ot',
    'expediente',
    'id orden',
    'id ticket',
    'n ticket',
    'ticket number',
    'ticketnumber',
    'order number',
    'ordernumber',
    'work order',
    'repair order',
    'service order',
    'job number',
    'job id',
    'service id',
  ],
  device_type: [
    'tipo equipo',
    'tipo de equipo',
    'dispositivo',
    'equipo',
    'aparato',
    'tipo',
    'device',
    'device type',
    'devicetype',
  ],
  device_brand: ['marca', 'brand', 'make'],
  device_model: ['modelo', 'model'],
  device_category: ['categoria', 'categoría', 'category', 'familia', 'rubro', 'linea', 'línea'],
  device_screen_inches: ['pulgadas', 'pantalla', 'screen', 'pulg', 'screen size'],
  serial_number: ['serie', 'serial', 's n', 'sn', 'serial number', 'serialnumber'],
  imei: ['imei'],
  issue_description: [
    'problema',
    'falla',
    'descripcion',
    'descripción',
    'detalle orden',
    'detalle de la orden',
    'detalle del trabajo',
    'trabajo',
    'trabajo a realizar',
    'servicio',
    'servicio solicitado',
    'reparacion solicitada',
    'reparación solicitada',
    'motivo',
    'motivo ingreso',
    'ingreso',
    'ingreso taller',
    'averia',
    'avería',
    'incidencia',
    'sintoma',
    'síntoma',
    'sintomas',
    'reporte',
    'reporte cliente',
    'comentario cliente',
    'observaciones orden',
    'issue',
    'problem',
    'description',
  ],
  status: [
    'estado',
    'estado orden',
    'estado del boleto',
    'estado del ticket',
    'estado reparacion',
    'estado reparación',
    'status',
    'state',
  ],
  priority: ['prioridad', 'priority'],
  task_type: [
    'tarea',
    'canal',
    'tipo tarea',
    'task type',
    'origen',
    'channel',
    'origen orden',
    'tipo servicio',
  ],
  estimated_cost: [
    'coste estimado',
    'costo estimado',
    'presupuesto',
    'estimado',
    'estimated',
    'estimated cost',
    'estimatedcost',
  ],
  final_cost: [
    'coste final',
    'costo final',
    'importe final',
    'total',
    'final cost',
    'finalcost',
    'amount',
  ],
  notes: [
    'notas ticket',
    'notas reparacion',
    'notas reparación',
    'observaciones',
    'notes',
    'comments',
  ],
  diagnostic_notes: [
    'diagnostico',
    'diagnóstico',
    'notas tecnicas',
    'notas técnicas',
    'diagnosis',
    'technical notes',
  ],
};

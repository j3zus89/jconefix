/**
 * Schemas de importación para todas las entidades del sistema.
 * Cada campo tiene aliases exhaustivos en: español, inglés, portugués,
 * y los nombres exactos que usan los softwares más comunes.
 *
 * Softwares cubiertos (probados manualmente):
 *   Clientes: Google Contacts, iPhone Contacts (vCard→CSV), WhatsApp Business,
 *             Shopify, WooCommerce, Odoo, Zoho CRM, HubSpot, Alegra,
 *             Bind ERP, Xero, QuickBooks, Mercado Libre, GetResponse, Mailchimp,
 *             Excel manual ES/EN/PT.
 *
 *   Inventario: Square, Shopify, WooCommerce, Odoo, QuickBooks, Allegra,
 *               VIAMOVIL, Xero, Vend, Lightspeed, Excel manual ES/EN/PT.
 */

import type { FieldSchema } from '@/lib/smart-import-mapper';

// ─────────────────────────────────────────────────────────────────────────────
// CLIENTES
// ─────────────────────────────────────────────────────────────────────────────

export const CUSTOMER_SCHEMA: FieldSchema[] = [
  {
    field: 'name',
    label: 'Nombre completo',
    required: true,
    aliases: [
      // ES genérico
      'nombre completo', 'nombre del cliente', 'nombre de cliente',
      'nombre y apellidos', 'nombre contacto', 'contacto', 'titular',
      'cliente', 'nombre apellido',
      // EN genérico
      'full name', 'fullname', 'name', 'customer name', 'contact name',
      'display name', 'account name',
      // PT (Brasil)
      'nome completo', 'nome do cliente', 'cliente',
      // Shopify
      'billing name', 'shipping name',
      // HubSpot
      'contact name',
      // Zoho
      'full name',
      // Odoo
      'partner name', 'name',
      // Google Contacts (tiene "Name" como columna combinada)
      'name',
    ],
  },
  {
    field: 'first_name',
    label: 'Nombre',
    aliases: [
      // ES
      'nombre', 'primer nombre', 'nombre de pila',
      // EN
      'first name', 'firstname', 'given name', 'forename',
      // PT
      'nome', 'primeiro nome',
      // Google Contacts
      'given name',
      // iPhone / iCloud
      'first name',
      // WhatsApp Business
      'nombre',
      // Shopify
      'first name',
      // HubSpot
      'first name',
    ],
  },
  {
    field: 'last_name',
    label: 'Apellidos',
    aliases: [
      // ES
      'apellidos', 'apellido', 'primer apellido', 'segundo apellido',
      // EN
      'last name', 'lastname', 'surname', 'family name',
      // PT
      'sobrenome', 'apelido',
      // Google Contacts
      'family name',
      // iPhone
      'last name',
      // Shopify
      'last name',
      // HubSpot
      'last name',
    ],
  },
  {
    field: 'email',
    label: 'Correo electrónico',
    aliases: [
      // ES
      'correo electronico', 'correo', 'email', 'e-mail', 'mail', 'direccion email',
      // EN
      'email', 'email address', 'e-mail address', 'e-mail',
      // PT
      'email', 'correio eletronico',
      // Google Contacts
      'e-mail 1 - value', 'email 1 - value', 'email address',
      // iPhone
      'email',
      // Shopify
      'email',
      // HubSpot
      'email',
      // Mailchimp
      'email address',
      // GetResponse
      'email',
      // Odoo
      'email',
      // Zoho
      'email',
    ],
  },
  {
    field: 'phone',
    label: 'Teléfono',
    aliases: [
      // ES
      'telefono', 'telefono movil', 'movil', 'celular', 'cel', 'tel',
      'numero de telefono', 'numero telefono', 'telefono celular',
      // EN
      'phone', 'mobile', 'mobile phone', 'cell', 'cell phone',
      'phone number', 'telephone', 'contact phone',
      // PT
      'telefone', 'celular', 'numero de telefone',
      // Google Contacts
      'phone 1 - value', 'mobile phone',
      // iPhone
      'phone',
      // WhatsApp Business
      'telefono', 'phone',
      // Shopify
      'phone', 'billing phone', 'shipping phone',
      // HubSpot
      'phone number',
      // Zoho
      'phone',
      // Odoo
      'phone', 'mobile',
      // Allegra
      'telefono',
    ],
  },
  {
    field: 'organization',
    label: 'Empresa / Organización',
    aliases: [
      // ES
      'empresa', 'organizacion', 'razon social', 'denominacion social',
      'denominacion', 'negocio', 'nombre empresa', 'nombre comercial',
      'nombre fantasia', 'comercio',
      // EN
      'company', 'company name', 'organization', 'organisation',
      'business', 'business name', 'account name',
      // PT
      'empresa', 'organizacao', 'razao social',
      // Google Contacts
      'organization name', 'organization 1 - name',
      // iPhone
      'company',
      // Shopify
      'billing company', 'shipping company', 'company',
      // HubSpot
      'company name',
      // Zoho
      'account name',
      // Odoo
      'company',
      // Xero
      'company name',
    ],
  },
  {
    field: 'address',
    label: 'Dirección',
    aliases: [
      // ES
      'direccion', 'domicilio', 'calle', 'calle y numero', 'domicilio fiscal',
      // EN
      'address', 'street', 'street address', 'address line 1',
      // PT
      'endereco', 'rua',
      // Google Contacts
      'address 1 - street',
      // Shopify
      'billing address1', 'shipping address1',
      // HubSpot
      'street address',
      // Odoo
      'street',
    ],
  },
  {
    field: 'city',
    label: 'Ciudad / Localidad',
    aliases: [
      'ciudad', 'localidad', 'poblacion', 'municipio',
      'city', 'town',
      'cidade',
      'address 1 - city', 'billing city', 'shipping city',
    ],
  },
  {
    field: 'state',
    label: 'Provincia / Estado',
    aliases: [
      'provincia', 'estado', 'region', 'comunidad', 'departamento',
      'state', 'region', 'province',
      'estado', 'uf',
      'address 1 - region', 'billing province', 'shipping province',
    ],
  },
  {
    field: 'postal_code',
    label: 'Código Postal',
    aliases: [
      'codigo postal', 'cp', 'cod postal',
      'zip', 'zip code', 'postal code', 'postcode',
      'cep', 'codigo postal',
      'address 1 - postal code', 'billing zip', 'shipping zip',
    ],
  },
  {
    field: 'country',
    label: 'País',
    aliases: [
      'pais', 'nacion',
      'country', 'country code',
      'pais', 'nacao',
      'address 1 - country', 'billing country', 'shipping country',
    ],
  },
  {
    field: 'notes',
    label: 'Notas',
    aliases: [
      'notas', 'observaciones', 'comentarios', 'nota', 'descripcion',
      'notes', 'comments', 'memo', 'description', 'remarks',
      'notas', 'observacoes',
      'note',
    ],
  },
  {
    field: 'id_number',
    label: 'Número de documento (DNI/CUIT/RUT)',
    aliases: [
      // ES
      'numero documento', 'dni', 'cuit', 'cuil', 'rut', 'ruc',
      'nif', 'cif', 'nie', 'cedula', 'numero de identificacion',
      'documento', 'id fiscal',
      // EN
      'tax id', 'vat number', 'id number', 'identification number',
      'ssn', 'national id',
      // PT
      'cpf', 'cnpj', 'documento',
      // Odoo
      'vat', 'tax id',
    ],
  },
  {
    field: 'id_type',
    label: 'Tipo de documento',
    aliases: [
      'tipo documento', 'tipo de documento', 'tipo id',
      'document type', 'id type',
      'tipo documento',
    ],
  },
  {
    field: 'customer_group',
    label: 'Grupo de clientes',
    aliases: [
      'grupo', 'grupo de clientes', 'tipo cliente', 'categoria cliente',
      'customer group', 'group', 'segment', 'tier',
    ],
  },
  {
    field: 'gdpr_consent',
    label: 'Consentimiento RGPD/GDPR',
    aliases: [
      'rgpd', 'gdpr', 'consentimiento', 'gdpr consent', 'rgpd conforme',
      'consent', 'acepta comunicaciones',
    ],
  },
  {
    field: 'mailchimp_status',
    label: 'Estado Mailchimp / Newsletter',
    aliases: [
      'mailchimp', 'mailchimp status', 'newsletter', 'suscrito', 'subscribed',
      'email marketing status',
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// INVENTARIO / REPUESTOS
// ─────────────────────────────────────────────────────────────────────────────

export const INVENTORY_SCHEMA: FieldSchema[] = [
  {
    field: 'name',
    label: 'Nombre del repuesto *',
    required: true,
    aliases: [
      // ES
      'nombre', 'nombre repuesto', 'nombre articulo', 'nombre del articulo',
      'denominacion', 'articulo', 'producto', 'descripcion corta',
      // EN
      'name', 'item name', 'product name', 'part name', 'description',
      'item', 'inventory name',
      // PT
      'nome', 'produto', 'descricao',
      // Square
      'item name',
      // Shopify
      'title',
      // WooCommerce
      'name',
      // Odoo
      'internal reference', 'product name',
      // QuickBooks
      'item name/number',
      // Lightspeed
      'description',
    ],
  },
  {
    field: 'sku',
    label: 'SKU / Código interno',
    aliases: [
      // ES
      'sku', 'codigo', 'codigo interno', 'referencia', 'ref', 'codigo producto',
      // EN
      'sku', 'item id', 'product id', 'internal id', 'part number',
      'code', 'item number',
      // Square
      'name code', 'name/code', 'multiple supplier skus', 'supplier skus',
      // Shopify
      'variant sku',
      // WooCommerce
      'sku',
      // Odoo
      'internal reference',
      // QuickBooks
      'item name/number',
    ],
  },
  {
    field: 'upc',
    label: 'UPC / EAN / Código de barras',
    aliases: [
      'upc', 'ean', 'barcode', 'codigo barras', 'codigo de barras', 'sku upc',
      'gtin', 'isbn',
      // Shopify
      'variant barcode',
      // Square
      'sku upc',
    ],
  },
  {
    field: 'category',
    label: 'Categoría',
    aliases: [
      'categoria', 'tipo', 'tipo producto', 'familia',
      'category', 'product type', 'item type', 'department',
      'categoria',
      // Shopify
      'product category', 'type',
      // WooCommerce
      'categories',
      // Square
      'category',
      // Odoo
      'category',
    ],
  },
  {
    field: 'brand',
    label: 'Marca',
    aliases: [
      'marca', 'fabricante',
      'brand', 'manufacturer', 'make', 'vendor',
      'marca',
      // Shopify
      'vendor',
    ],
  },
  {
    field: 'model',
    label: 'Modelo',
    aliases: [
      'modelo', 'modelo compatible', 'numero modelo',
      'model', 'model number', 'model no', 'model name',
      'modelo',
    ],
  },
  {
    field: 'quantity',
    label: 'Cantidad en stock',
    aliases: [
      // ES
      'cantidad', 'stock', 'existencias', 'unidades', 'inventario',
      'cantidad disponible',
      // EN
      'quantity', 'qty', 'stock quantity', 'quantity on hand',
      'qty on hand', 'on hand qty', 'current quantity', 'available quantity',
      // Square
      'quantity on hand',
      // Shopify
      'variant inventory qty',
      // WooCommerce
      'stock',
      // Odoo
      'on hand quantity',
    ],
  },
  {
    field: 'stock_warning',
    label: 'Alerta de stock mínimo',
    aliases: [
      'stock minimo', 'minimo', 'alerta stock', 'advertencia stock',
      'min stock', 'low stock alert', 'stock warning', 'minimum stock level',
      'stock limite',
    ],
  },
  {
    field: 'reorder_level',
    label: 'Nivel de reorden',
    aliases: [
      'nivel reorden', 'punto de pedido', 'punto reorden',
      'reorder level', 'reorder point', 'minimum order quantity',
    ],
  },
  {
    field: 'price',
    label: 'Precio de venta',
    aliases: [
      // ES
      'precio', 'precio venta', 'pvp', 'precio publico', 'precio de venta',
      // EN
      'price', 'sale price', 'selling price', 'list price',
      'retail price', 'default price', 'minimum price',
      // Square
      'minimum price',
      // Shopify
      'variant price',
      // WooCommerce
      'regular price', 'sale price',
      // Odoo
      'sales price',
    ],
  },
  {
    field: 'unit_cost',
    label: 'Costo unitario (precio de compra)',
    aliases: [
      // ES
      'costo', 'coste', 'precio compra', 'precio costo', 'costo unitario',
      'precio proveedor', 'compra',
      // EN
      'cost', 'unit cost', 'purchase price', 'cost price',
      'standard cost', 'average cost', 'item cost',
      // Square
      'new inventory item cost', 'inventory item cost',
      // Odoo
      'cost',
    ],
  },
  {
    field: 'supplier',
    label: 'Proveedor',
    aliases: [
      'proveedor', 'distribuidor',
      'supplier', 'vendor', 'distributor',
      'fornecedor',
    ],
  },
  {
    field: 'condition',
    label: 'Condición',
    aliases: [
      'condicion', 'estado', 'grado', 'calidad',
      'condition', 'grade', 'quality',
      'condicao',
    ],
  },
  {
    field: 'description',
    label: 'Descripción larga',
    aliases: [
      'descripcion', 'descripcion larga', 'detalle',
      'description', 'long description', 'full description', 'notes',
      'descricao',
      // Shopify
      'body (html)',
    ],
  },
  {
    field: 'serial',
    label: 'Número de serie',
    aliases: [
      'numero serie', 'serie', 'serial', 'ns',
      'serial number', 'serial no',
      'numero de serie',
    ],
  },
  {
    field: 'imei',
    label: 'IMEI',
    aliases: ['imei', 'imei number', 'imei no'],
  },
];

import { normalizeHeader } from '@/lib/excel-export';

/**
 * Etiquetas en español para cabeceras de Excel en inglés (Square, VIAMOVIL, WooCommerce, etc.).
 * Claves = salida de normalizeHeader(texto original). El <option value=""> sigue siendo el texto del archivo.
 */
const HEADER_ES_BY_NORMALIZED: Record<string, string> = {
  // ── IDs y jerarquía
  'item id': 'ID de artículo',
  'parent id': 'ID elemento padre',
  'serial number': 'Número de serie',
  'product id': 'ID de producto',
  'internal id': 'ID interno',
  'variant id': 'ID de variante',
  'external id': 'ID externo',

  // ── Nombre, descripción, variante
  'item name': 'Nombre del artículo',
  'product name': 'Nombre del producto',
  'inventory name': 'Nombre en inventario',
  'variation name': 'Nombre de variante',
  'item variation': 'Variante del artículo',
  description: 'Descripción',
  'long description': 'Descripción larga',
  'full description': 'Descripción completa',
  'short description': 'Descripción breve',
  'seo title': 'Título SEO',
  'seo description': 'Descripción SEO',
  permalink: 'Enlace permanente',
  slug: 'Slug URL',
  'button name': 'Texto del botón',
  'name code': 'Código / nombre',
  'name/code': 'Código / nombre',

  // ── Categorización y atributos
  category: 'Categoría',
  'reporting category': 'Categoría de informes',
  'product type': 'Tipo de producto',
  tags: 'Etiquetas',
  brand: 'Marca',
  manufacturer: 'Fabricante',
  vendor: 'Proveedor / vendedor',
  model: 'Modelo',
  'model number': 'Número de modelo',
  device: 'Dispositivo',
  size: 'Talla / tamaño',
  color: 'Color',
  network: 'Red / operador',
  material: 'Material',
  pattern: 'Estampado / patrón',
  style: 'Estilo',
  weight: 'Peso',
  'item weight': 'Peso del artículo',
  unit: 'Unidad',
  dimensions: 'Dimensiones',
  'age group': 'Grupo de edad',
  gender: 'Género',

  // ── Códigos y barras
  sku: 'SKU',
  upc: 'UPC',
  gtin: 'GTIN',
  barcode: 'Código de barras',
  ean: 'EAN',
  isbn: 'ISBN',
  mpn: 'Número de pieza (MPN)',
  'sku upc': 'SKU / UPC',
  skuupc: 'SKU / UPC',
  'multiple supplier skus': 'SKUs de varios proveedores',
  'supplier skus': 'SKUs del proveedor',
  'codigo interno': 'Código interno',

  // ── Proveedor y compra
  supplier: 'Proveedor',

  // ── Inventario y stock
  'manage inventory level': 'Gestionar nivel de inventario',
  'track inventory': 'Seguimiento de inventario',
  'track stock': 'Seguimiento de stock',
  'valuation method': 'Método de valoración',
  'manage serials': 'Gestionar números de serie',
  'on hand qty': 'Cantidad disponible',
  'on hand quantity': 'Cantidad disponible',
  'current quantity': 'Cantidad actual',
  'quantity on hand': 'Cantidad en almacén',
  'qty on hand': 'Cantidad disponible',
  'new stock adjustment': 'Nuevo ajuste de inventario',
  'stock warning': 'Aviso de stock bajo',
  'low stock alert': 'Alerta de stock bajo',
  'min stock level': 'Nivel mínimo de stock',
  'reorder level': 'Nivel de reposición',
  're order level': 'Nivel de reposición',
  'reorder point': 'Punto de pedido',
  reorder: 'Reposición',
  quantity: 'Cantidad',
  qty: 'Cantidad',
  stock: 'Stock',
  existencias: 'Existencias',
  'physical location': 'Ubicación física',
  'bin location': 'Ubicación de almacén',
  aisle: 'Pasillo',
  shelf: 'Estantería',
  warehouse: 'Almacén',

  // ── Precios (retail, online, promos…)
  price: 'Precio',
  'retail price': 'Precio al público',
  'default price': 'Precio por defecto',
  'sale price': 'Precio de venta',
  'list price': 'Precio de lista',
  'online price': 'Precio online',
  'promotional price': 'Precio promocional',
  'minimum price': 'Precio mínimo',
  'compare at price': 'Precio de comparación (tachado)',
  'cost price': 'Precio de coste',
  wholesale: 'Mayorista',
  'wholesale price': 'Precio mayorista',
  'unit cost': 'Coste unitario',
  'standard cost': 'Coste estándar',
  'average cost': 'Coste medio',
  'new inventory item cost': 'Coste del artículo (nuevo en inventario)',
  'inventory item cost': 'Coste del artículo',
  'price point': 'Escalón de precio',
  'pricing type': 'Tipo de precio',
  'sold by': 'Vendido por',
  'unit and precision': 'Unidad y precisión',

  // ── Impuestos
  'tax class': 'Clase fiscal',
  'tax category': 'Categoría fiscal',
  'tax inclusive': 'Impuestos incluidos',
  'tax included': 'Impuestos incluidos',
  taxable: 'Sujeto a impuesto',
  'vat rate': 'Tipo de IVA',
  'sales tax': 'Impuesto sobre ventas',

  // ── Garantía
  warranty: 'Garantía',
  'warranty time frame': 'Plazo de garantía',
  'warranty period': 'Periodo de garantía',

  // ── Condición y estado
  condition: 'Condición',
  status: 'Estado',
  enabled: 'Activado',
  disabled: 'Desactivado',
  archived: 'Archivado',
  visibility: 'Visibilidad',
  'visibility online': 'Visibilidad en tienda online',
  published: 'Publicado',
  draft: 'Borrador',

  // ── TPV / canal de venta
  'display on point of sale': 'Mostrar en punto de venta',
  'point of sale name': 'Nombre en TPV',
  pos: 'TPV',
  'skip detail screen in pos': 'Omitir ficha detalle en TPV',
  'pickup enabled': 'Recogida en tienda activada',
  'delivery enabled': 'Entrega activada',
  channels: 'Canales de venta',

  // ── Comisiones
  'commission percentage': 'Porcentaje de comisión',
  'commission amount': 'Importe de comisión',
  'commission rate': 'Tipo de comisión',

  // ── Integraciones
  'sync with woocommerce': 'Sincronizar con WooCommerce',
  woocommerce: 'WooCommerce',
  shopify: 'Shopify',
  square: 'Square',

  // ── Imágenes y medios
  'image url': 'URL de imagen',
  'image urls': 'URLs de imágenes',
  images: 'Imágenes',
  thumbnail: 'Miniatura',

  // ── Notas y extras
  notes: 'Notas',
  'internal notes': 'Notas internas',
  'custom attribute': 'Atributo personalizado',
  'meta field': 'Campo meta',
  nutrition: 'Información nutricional',
  ingredients: 'Ingredientes',
  calories: 'Calorías',
  'serving size': 'Tamaño de porción',

  // ── IMEI / dispositivos
  imei: 'IMEI',
  meid: 'MEID',
  serial: 'Número de serie',
  'serial numbers': 'Números de serie',

  // ── Campos ya frecuentes en español en export (por si vienen mezclados)
  categoria: 'Categoría',
  nombre: 'Nombre',
  articulo: 'Artículo',
  producto: 'Producto',
  descripcion: 'Descripción',
  marca: 'Marca',
  modelo: 'Modelo',
  proveedor: 'Proveedor',
  cantidad: 'Cantidad',
  precio: 'Precio',
  coste: 'Coste',
  costo: 'Costo',
  condicion: 'Condición',
  estado: 'Estado',
  referencia: 'Referencia',
  codigo: 'Código',
  ean13: 'EAN-13',
};

/**
 * Texto para mostrar en UI (select, tabla previa). Si no hay traducción, se muestra el original.
 */
export function inventoryExcelHeaderLabelEs(header: string): string {
  const t = header?.trim();
  if (!t) return '(vacío)';
  const key = normalizeHeader(t);
  return HEADER_ES_BY_NORMALIZED[key] ?? t;
}

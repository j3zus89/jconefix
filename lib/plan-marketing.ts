/** Textos de venta alineados con rutas reales del dashboard; evitar prometer fuera del código. */

import { PRICING_AR } from '@/lib/pricing-config';

const JC_PLAN_AR_HEADLINE_SUFFIX = 'Plan Premium Full';

/** Plan Argentina — precios en ARS (números desde `lib/pricing-config.ts`). */
export const JC_PLAN_AR = {
  /** Texto del H1 tras el wordmark «JC ONE FIX» (misma línea, con guión largo). */
  planHeadlineSuffix: JC_PLAN_AR_HEADLINE_SUFFIX,
  title: `JC ONE FIX – ${JC_PLAN_AR_HEADLINE_SUFFIX}`,
  priceMonth: PRICING_AR.PRECIO_MENSUAL,
  priceYear: PRICING_AR.PRECIO_ANUAL,
  currency: 'ARS',
  symbol: '$',
  headerNote:
    'Todo se factura en pesos argentinos. La cuota mensual es la publicada en la web; si hubiera un ajuste, lo anunciamos con tiempo antes de tu próxima renovación. El plan anual fija el total por los 12 meses que abonaste.',
  desc:
    'Software y gestor de taller para reparación con operación en pesos (ARS): tickets, clientes, inventario, TPV, facturación e informes. Ideal para celulares, electrónica y microsoldadura. Asistente Gemini opcional con la API key de tu taller; integración ARCA/AFIP con CAE al cobrar, QR en PDF y comprobantes cuando cargás certificado y punto de venta.',
  /** Frases calibradas a longitud similar (título + cuerpo) para grilla de 3 columnas en la landing. */
  features: [
    'Tickets y reparaciones: recepción, entradas, garantías y seguimiento por estado y técnico en un flujo único de punta a punta.',
    'Alertas por retraso: avisos al técnico cuando el ticket sigue en espera de piezas, cliente o presupuesto.',
    'Clientes y fiscal: CUIT/CUIL, historial, leads en pipeline, importación asistida desde Excel y ficha unificada por persona.',
    'Inventario y precios: actualización masiva, stock por ubicación y alertas de mínimo para la inflación diaria.',
    'Compras y traslados: órdenes a proveedores y movimientos entre sedes o depósitos sin duplicar información.',
    'TPV y caja: cobros, arqueos e historial de ventas en el mismo módulo para cerrar el día sin saltos.',
    'Gastos e informes: hub de ventas y gastos, flujo de caja, exportación para el contador e informes en pesos argentinos.',
    'WhatsApp al cliente: enviá el estado de la reparación al celular con avisos claros y sin trabajo manual extra.',
    'Portal web cliente: consultá el estado online sin llamar; acceso simple mediante enlace o código seguro.',
    'Notificaciones internas: cada cambio relevante avisa al técnico asignado dentro del panel al instante.',
    'Chat y turnos: mensajería interna del equipo y control de horario, turnos y fichaje en una sola vista.',
    'ARCA / AFIP en panel: certificado, CAE al cobrar, número oficial, QR en PDF y comprobantes según tu caso.',
    'IA Gemini en tickets: sugerencias y borradores más rápidos con la clave de Google que configurás en tu taller.',
    'Presupuestos por WhatsApp: mensaje listo en segundos con plantilla o texto pulido con IA según la configuración del servicio.',
    'Código QR público: el cliente escanea y ve el estado de la reparación en la web al momento, sin cuenta.',
    'Devoluciones: registrá en el ticket, imprimí constancia en PDF y seguí el detalle centralizado en Finanzas.',
    'Repuestos en cajón: asigná cada pieza a un lugar físico del taller para ubicarla sin perder tiempo.',
    'Impresión QZ Tray y nodo: etiquetas y tickets directo a impresora o nodo en red, sin cuadros del navegador.',
    'Multi-sede unificada: varios talleres en un panel con permisos claros y stock coherente entre sedes.',
    'Guía de uso en panel: capacitación paso a paso para que el equipo aprenda sin manuales sueltos.',
    'Técnicos ilimitados: usuarios operativos sin tope en la licencia y sin cargo extra por sumar técnico.',
  ],
  highlight: true as const,
};

/** Misma oferta que `JC_PLAN_AR` (alias para checkout/admin que importaban `JC_SINGLE_PLAN`). */
export const JC_SINGLE_PLAN = {
  title: 'JC ONE FIX',
  priceMonth: JC_PLAN_AR.priceMonth,
  priceYear: JC_PLAN_AR.priceYear,
  desc: JC_PLAN_AR.desc,
  features: JC_PLAN_AR.features,
  highlight: true as const,
};

/**
 * Landing estáticas /rubros/[slug] — captura búsquedas tipo «software taller celulares Argentina».
 */
export const RUBRO_SLUGS = ['celulares', 'computadoras', 'refrigeracion', 'electronica'] as const;
export type RubroSlug = (typeof RUBRO_SLUGS)[number];

export type RubroContent = {
  slug: RubroSlug;
  /** Para <title> y OpenGraph */
  metaTitle: string;
  metaDescription: string;
  /** Sustantivo para el H1 */
  h1Label: string;
  intro: string;
  painPoints: { title: string; body: string }[];
  closing: string;
};

export const RUBROS: Record<RubroSlug, RubroContent> = {
  celulares: {
    slug: 'celulares',
    metaTitle: 'Software para servicio técnico de celulares en Argentina',
    metaDescription:
      'Órdenes de reparación, etiquetas de ingreso, IMEI y presupuestos por WhatsApp. Facturación electrónica ARCA, stock de repuestos y panel para taller de smartphones en Argentina con Jconefix.',
    h1Label: 'Celulares',
    intro:
      'En un taller de smartphones el cuello de botella no es la soldadura: es el caos en el mostrador. Sin un registro claro, dos técnicos tocan el mismo equipo, el cliente llama cuatro veces por el mismo iPhone y el repuesto «que estaba en el cajón» aparece cuando ya pediste otro al proveedor.',
    painPoints: [
      {
        title: 'Etiquetas e ingreso en segundos',
        body: 'Ticket con modelo, IMEI, estado estético y accesorios recibidos. El cliente firma en pantalla o recibe el comprobante por WhatsApp: menos discusiones y más trazabilidad.',
      },
      {
        title: 'Stock que no se «pierde» entre cajones',
        body: 'Pantallas, tapas y flex en ubicaciones reales; alertas de mínimo antes de quedarte sin la pieza más vendida del mes.',
      },
      {
        title: 'Presupuesto y seguimiento sin hojas sueltas',
        body: 'El mismo flujo sirve para microsoldadura y para cambio de módulo: estados del ticket, notas internas y avisos al cliente cuando el equipo está listo.',
      },
    ],
    closing:
      'Jconefix une reparaciones, clientes, inventario y cobros en un solo panel pensado para talleres que viven del volumen y la reputación.',
  },
  computadoras: {
    slug: 'computadoras',
    metaTitle: 'Software para taller de computación y notebooks en Argentina',
    metaDescription:
      'Tickets por equipo, repuestos, garantías y facturación ARCA. Control de stock, presupuestos y seguimiento para servicio técnico de PCs y notebooks con Jconefix.',
    h1Label: 'Computación',
    intro:
      'El taller de PC mezcla diagnósticos largos, upgrades, recuperación de datos y «me lo dejaron así». Sin historial por máquina, repetís el mismo test cada vez que entra el cliente y no sabés si el disco ya tenía sectores defectuosos en la visita anterior.',
    painPoints: [
      {
        title: 'Historial por equipo y por cliente',
        body: 'Serie, etiqueta interna, componentes instalados y notas de diagnóstico quedan vinculados al ticket. Cuando vuelve «el mismo HP», abrís el contexto en un clic.',
      },
      {
        title: 'Presupuestos con repuestos reales',
        body: 'Asociá fuentes, RAM o SSD al pedido desde inventario o dejá pendiente la compra: el ticket refleja costo y margen sin Excel paralelo.',
      },
      {
        title: 'Facturación alineada a Argentina',
        body: 'Cuando configurás ARCA/AFIP y punto de venta, los cobros pueden generar comprobante con CAE sin duplicar datos en otro sistema.',
      },
    ],
    closing:
      'Menos fricción entre mostrador y taller: un solo lugar para saber qué hay en banco de pruebas, qué está esperando repuesto y qué podés entregar hoy.',
  },
  refrigeracion: {
    slug: 'refrigeracion',
    metaTitle: 'Software para servicio técnico de refrigeración en Argentina',
    metaDescription:
      'Presupuestos rápidos, visitas y órdenes de reparación. Control de stock, clientes y facturación electrónica ARCA para frigoristas y talleres de refrigeración con Jconefix.',
    h1Label: 'Refrigeración',
    intro:
      'Muchas visitas son en la calle: medís presiones, cargás gas y tenés que dejar asentado qué máquina es, qué se hizo y qué quedó pendiente antes de subir al furgón. Si eso vive en un papel, al volver al taller nadie factura igual y el seguimiento de garantía se vuelve una adivinanza.',
    painPoints: [
      {
        title: 'Presupuestos en el momento',
        body: 'Armá líneas de mano de obra, repuesto y traslado desde el celular o la notebook; enviá el resumen por WhatsApp con el mismo texto que queda en el ticket.',
      },
      {
        title: 'Cliente y ubicación claros',
        body: 'Dirección, teléfono de contacto y tipo de equipo (split, exhibidor, cámara) en la ficha: cuando el cliente reclama a los tres meses, tenés el parte escrito.',
      },
      {
        title: 'Stock de recargas y repuestos comunes',
        body: 'Controlá válvulas, motores o kits sin mezclarlos con el resto del depósito; ideal si además vendés repuesto al público.',
      },
    ],
    closing:
      'Lo que cerrás en la obra queda en el sistema: menos llamadas de «¿qué le pusimos a este split?» y más tiempo para instalar y reparar.',
  },
  electronica: {
    slug: 'electronica',
    metaTitle: 'Software para taller de electrónica y reparación en Argentina',
    metaDescription:
      'Órdenes de reparación, inventario, clientes y facturación ARCA. Para TV, audio, consolas y electrónica general — panel Jconefix con notificaciones y control de stock.',
    h1Label: 'Electrónica',
    intro:
      'Cuando el rubro es amplio — desde una barra de sonido hasta una placa de consola— lo que importa es no mezclar criterios: un técnico anota en el ticket, otro en el WhatsApp personal y el dueño mira solo la caja registradora. Ahí es donde se pierde el margen.',
    painPoints: [
      {
        title: 'Un ticket por equipo, sin importar la categoría',
        body: 'Smart TV, home theater o soldadura fina: mismos estados, mismas reglas de facturación y mismos informes para ver qué rubro deja más ganancia.',
      },
      {
        title: 'Comunicación con el cliente centralizada',
        body: 'Notificaciones por email y WhatsApp desde el flujo del ticket: menos «se me pasó avisar» y más entregas en fecha.',
      },
      {
        title: 'Inventario que acompaña proyectos largos',
        body: 'Equipos en espera de pieza importada o en prueba de banco: siempre visible en el listado, sin depender de la memoria del encargado.',
      },
    ],
    closing:
      'Jconefix escala con tu taller: desde un equipo por semana hasta decenas de ingresos diarios, con ARCA/AFIP cuando vos configurás la facturación electrónica.',
  },
};

export function isRubroSlug(s: string): s is RubroSlug {
  return (RUBRO_SLUGS as readonly string[]).includes(s);
}

export function getRubroSlugs(): RubroSlug[] {
  return [...RUBRO_SLUGS];
}

/**
 * Landing pages long-tail para SEO en Argentina (rubros específicos).
 * Rutas: /soluciones/[slug]
 */

export type ArgentinaLandingSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type ArgentinaLandingPage = {
  slug: string;
  /** <title> y H1 */
  title: string;
  metaDescription: string;
  keywords: string[];
  intro: string;
  sections: ArgentinaLandingSection[];
};

export const ARGENTINA_LANDING_PAGES: ArgentinaLandingPage[] = [
  {
    slug: 'software-servicio-tecnico-celulares-afip',
    title: 'Software para Servicio Técnico de Celulares con AFIP',
    metaDescription:
      'Gestioná tu servicio técnico de celulares en Argentina con JC ONE FIX: órdenes de reparación, stock de repuestos, clientes con CUIT y facturación alineada a ARCA/AFIP. Probá 15 días gratis.',
    keywords: [
      'software servicio técnico celulares Argentina',
      'gestión taller celulares AFIP',
      'sistema reparación smartphones ARCA',
      'software taller celulares Buenos Aires',
    ],
    intro:
      'Si tu negocio vive del mostrador y del taller, no alcanza con una planilla: necesitás trazabilidad por equipo, historial del cliente y comprobantes que no te compliquen con la normativa. **JC ONE FIX** (también conocido como **Jconefix**) es el panel pensado para talleres que trabajan en pesos y quieren orden operativo sin renunciar a la facturación electrónica cuando corresponde.',
    sections: [
      {
        heading: 'Del ingreso a la entrega, sin perder el hilo',
        paragraphs: [
          'Cada teléfono entra como **orden de reparación** con datos del equipo, falla declarada, fotos si las usás y estado visible para recepción y técnico. Así se reduce el clásico “¿qué le habíamos dicho al cliente?” y se acelera el pase de turno.',
          'En **JC ONE FIX** podés asignar técnico, marcar espera de repuesto o presupuesto y avisar al cliente por los canales que ya usás en el día a día del taller.',
        ],
        bullets: [
          'Historial por cliente: qué equipos trajo, qué se le reparó y qué cobró.',
          'Inventario con alertas de mínimo para no quedarte sin tapas, baterías o flex.',
          'TPV integrado para cobrar el arreglo y accesorios en el mismo flujo.',
        ],
      },
      {
        heading: 'AFIP y ARCA: menos estrés administrativo',
        paragraphs: [
          'En Argentina, la facturación y los comprobantes son parte del negocio. El sistema está preparado para el encaje con **ARCA/AFIP** cuando configurás certificado y punto de venta: podés emitir con **CAE** en los cobros que correspondan y mantener orden en las ventas del taller.',
          'No prometemos magia sin tu CUIT ni tu setup fiscal: sí ofrecemos **herramientas claras** para que el técnico monotributista o responsable inscripto no mezcle caja con “papeles sueltos”.',
        ],
      },
      {
        heading: 'Por qué elegir JC ONE FIX en tu servicio técnico',
        paragraphs: [
          'Somos **software de gestión de taller**, no un ERP genérico: el vocabulario y los flujos hablan de **órdenes**, **repuestos** y **clientes**, no de “proyectos” abstractos.',
          'Operás en **pesos (ARS)** con precios públicos en la web, sin sorpresas por tipo de cambio. Si querés ver el producto, **15 días de prueba** te permiten cargar datos reales sin tarjeta al inicio.',
        ],
      },
    ],
  },
  {
    slug: 'sistema-gestion-talleres-computacion-caba',
    title: 'Sistema de Gestión para Talleres de Computación en CABA',
    metaDescription:
      'Sistema de gestión para talleres de PC y notebooks en CABA y AMBA: tickets, diagnóstico, stock y facturación. JC ONE FIX en la nube, en pesos argentinos. Probá gratis.',
    keywords: [
      'software taller computación CABA',
      'gestión taller notebooks Buenos Aires',
      'sistema reparación PC Argentina',
      'software taller informática AMBA',
    ],
    intro:
      'Los talleres de **computación en CABA** compiten por tiempo de respuesta y confianza: el cliente quiere saber en qué está su máquina y vos necesitás priorizar diagnósticos, repuestos y entregas. **JC ONE FIX** centraliza la operación en un solo **sistema de gestión** pensado para reparación, no para retail genérico.',
    sections: [
      {
        heading: 'Notebooks, PCs y periféricos en la misma cola de trabajo',
        paragraphs: [
          'Creá **órdenes** por equipo con marca, modelo, número de serie cuando aplica y descripción del problema. Los estados (diagnóstico, esperando repuesto, listo para retirar) se entienden de un vistazo en recepción y en taller.',
        ],
        bullets: [
          'Asignación de técnico y seguimiento sin grupos de WhatsApp perdidos.',
          'Notas internas y comunicación con el cliente sin mezclar lo operativo con lo fiscal.',
        ],
      },
      {
        heading: 'Stock que acompaña al tipo de negocio',
        paragraphs: [
          'RAM, discos, fuentes, teclados: el **control de stock** con ubicación por cajón o estante ayuda a que el armado no se frene buscando una caja en el depósito.',
          'Las **órdenes de compra** a proveedores quedan registradas; cuando recibís mercadería, el flujo se acerca a lo que ya hacés en papel pero **sin duplicar datos**.',
        ],
      },
      {
        heading: 'Pensado para talleres que facturan en Argentina',
        paragraphs: [
          'Si estás en **CABA o alrededores**, operás en el mismo marco normativo que el resto del país: **JC ONE FIX** trabaja en **ARS** y ofrece caminos para **integración con ARCA/AFIP** cuando cargás certificado y configurás punto de venta.',
          'Te invitamos a **registrarte** y recorrer el panel con tus propios casos: la prueba gratuita es la mejor demo.',
        ],
      },
    ],
  },
  {
    slug: 'gestion-service-electrodomesticos-linea-blanca',
    title: 'Gestión de Service de Electrodomésticos y Línea Blanca',
    metaDescription:
      'Software para service de electrodomésticos y línea blanca: órdenes, domicilio, repuestos y cobros. JC ONE FIX — gestión de taller en pesos y soporte para facturación electrónica.',
    keywords: [
      'software service electrodomésticos',
      'gestión taller línea blanca Argentina',
      'sistema service lavarropas heladeras',
      'software reparación electrodomésticos',
    ],
    intro:
      'El **service de electrodomésticos** mezcla visitas, taller y seguimiento de piezas lentas. Sin un sistema, el riesgo es doble turno, repuesto encargado dos veces o reclamo sin respaldo. **JC ONE FIX** ordena **órdenes de reparación**, **stock** y **clientes** para que el equipo sepa qué pasó en cada hogar o en cada ingreso al taller.',
    sections: [
      {
        heading: 'Órdenes que aguantan el ritmo del rubro',
        paragraphs: [
          'Registrá tipo de artefacto, marca, modelo y falla. Si trabajás con domicilio y taller, las notas y el estado de la orden mantienen la historia en un solo lugar.',
        ],
        bullets: [
          'Historial por cliente para garantías y reingresos.',
          'Vinculación de repuestos usados en la orden para no “perder” margen.',
        ],
      },
      {
        heading: 'Stock y compras alineados a la operación real',
        paragraphs: [
          'Los repuestos de **línea blanca** suelen ser caros y de rotación lenta: el **control de stock** con mínimos y órdenes a proveedor reduce el capital muerto y las disculpas al cliente.',
        ],
      },
      {
        heading: 'Beneficios concretos con JC ONE FIX',
        paragraphs: [
          '**Menos fricción entre recepción y técnico**, **más claridad en cobros** con TPV y, cuando lo necesités, **comprobantes electrónicos** en línea con **AFIP** según tu configuración.',
          'Es **software en la nube**: accedés desde el local o desde casa sin instalar servidores. Probalo con la **cuenta de prueba** y medí el impacto en una semana.',
        ],
      },
    ],
  },
  {
    slug: 'software-reballing-microelectronica',
    title: 'Software para Reballing y Microelectrónica',
    metaDescription:
      'Gestión de taller para reballing, microsoldadura y microelectrónica: órdenes detalladas, trazabilidad de placas y stock de componentes. JC ONE FIX en Argentina (ARS).',
    keywords: [
      'software taller microsoldadura',
      'gestión reballing Argentina',
      'software microelectrónica taller',
      'sistema reparación placas Argentina',
    ],
    intro:
      'En **reballing y microelectrónica** el detalle importa: una placa no es “un genérico”. **JC ONE FIX** te permite documentar cada **orden** con el nivel de precisión que tu taller necesita, sin renunciar a **stock** de stencil, soldaduras o consumibles y a la **facturación** cuando entregás el trabajo.',
    sections: [
      {
        heading: 'Trazabilidad que vale oro en placas',
        paragraphs: [
          'Anotá síntomas, intervención, fotos si las usás y estado final. Cuando el cliente vuelve en seis meses, la **orden** anterior está a un clic.',
        ],
        bullets: [
          'Notas técnicas visibles solo para el equipo.',
          'Vínculo entre repuesto consumido y ticket para costeo.',
        ],
      },
      {
        heading: 'Inventario para el “taller fino”',
        paragraphs: [
          'Componentes y herramientas no siempre están en el mismo depósito que las pantallas de celular: el **control de stock** por ubicación ayuda a no frenar un trabajo por un chip “que estaba en algún cajón”.',
        ],
      },
      {
        heading: 'JC ONE FIX como aliado operativo',
        paragraphs: [
          'No reemplaza el microscopio ni la estación: **ordena el negocio** alrededor de tu especialidad. **Precios en pesos**, **panel web** y **integración ARCA/AFIP** cuando corresponda a tu situación fiscal.',
          'Si tu taller está en Argentina, **registrate** y comprobá si el flujo se adapta a cómo ya trabajás hoy.',
        ],
      },
    ],
  },
  {
    slug: 'facturacion-electronica-tecnicos-monotributistas',
    title: 'Facturación Electrónica para Técnicos Monotributistas',
    metaDescription:
      'Facturación electrónica y gestión de taller para técnicos monotributistas en Argentina: órdenes, cobros con CAE cuando aplica y comprobantes ARCA/AFIP. JC ONE FIX.',
    keywords: [
      'facturación electrónica monotributo técnico',
      'software taller monotributo AFIP',
      'CAE cobro taller Argentina',
      'ARCA facturación servicio técnico',
    ],
    intro:
      'El **monotributista** que repara en su taller o a domicilio necesita **orden** y **comprobantes** sin duplicar trabajo. **JC ONE FIX** une **órdenes de reparación**, **caja/TPV** y la posibilidad de **integración con ARCA/AFIP** para emitir con **CAE** en los cobros que configurés, siempre dentro de lo que permita tu categoría y tu punto de venta.',
    sections: [
      {
        heading: 'Un solo lugar para cobrar y justificar',
        paragraphs: [
          'Registrás el trabajo en una **orden**, cobrás por **TPV** y, con certificado y configuración adecuada, podés **facturar electrónicamente** alineado a las reglas vigentes.',
          'Esto no sustituye el asesoramiento de tu contador: **sí** reduce el salto entre “cobré en efectivo” y “todavía no emití nada”.',
        ],
      },
      {
        heading: 'Pensado para el técnico que factura en pesos',
        paragraphs: [
          'Todo el producto está orientado a **Argentina**: **ARS**, textos y flujos locales. No vas a pelear con un software pensado en dólares ni en normas de otro país.',
        ],
        bullets: [
          'Clientes con datos fiscales cuando los necesités.',
          'Historial de ventas y reparaciones para responder consultas o garantías.',
        ],
      },
      {
        heading: 'Empezá con JC ONE FIX (Jconefix)',
        paragraphs: [
          'La **prueba gratuita** te deja validar si el circuito encaja con tu rutina. Si después querés continuar, los **precios están publicados en pesos** en el sitio, sin letra chica en moneda extranjera.',
          'Entrá a **JC ONE FIX**: gestión de **órdenes**, **stock** y **facturación electrónica** cuando tu setup fiscal lo permita.',
        ],
      },
    ],
  },
];

const bySlug = new Map(ARGENTINA_LANDING_PAGES.map((p) => [p.slug, p]));

export function getArgentinaLandingSlugs(): string[] {
  return ARGENTINA_LANDING_PAGES.map((p) => p.slug);
}

export function getArgentinaLandingPage(slug: string): ArgentinaLandingPage | undefined {
  return bySlug.get(slug);
}


/**
 * Páginas de comparación / intención SEO (solo rutas /comparar/*).
 * Contenido curado: evitar duplicar con plantillas vacías.
 */

export type CompararComparisonRow = {
  /** Ej.: Interfaz, Instalación */
  aspect: string;
  jconefix: string;
  /** Texto neutro sobre el otro enfoque (sin descalificar marcas). */
  competitor: string;
};

export type CompararPageDef = {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  lead: string;
  updated: string;
  /** Encabezado de columna en la tabla (ej. nombre comercial del otro producto). */
  competitorLabel?: string;
  /** Tabla comparativa opcional (shadcn en la página). */
  comparisonTable?: CompararComparisonRow[];
  /** Bloque “por qué migrar / evolucionar”. */
  whyChange?: { title: string; paragraphs: string[] };
  sections: { title: string; paragraphs: string[] }[];
  faqs: { question: string; answer: string }[];
};

const pages: CompararPageDef[] = [
  {
    slug: 'excel-vs-software-taller-jc-one-fix',
    metaTitle: 'Excel vs software de taller: cuándo conviene JC ONE FIX',
    metaDescription:
      'Compará hojas de cálculo frente a un gestor de taller: tickets, stock, clientes y facturación. Guía honesta para talleres de reparación en Argentina y Latinoamérica.',
    h1: 'Excel vs software de gestión de taller (JC ONE FIX u otro)',
    lead:
      'Muchos talleres arrancan con Excel o Google Sheets: es barato y flexible. El tema aparece cuando crecen los tickets, el stock y la facturación. Acá va una comparación práctica, sin demonizar la planilla.',
    updated: '2026-04-06',
    sections: [
      {
        title: 'Qué resuelve bien Excel en un taller',
        paragraphs: [
          'Listas simples, presupuestos puntuales y tablas que armás a tu medida. Si sos una o dos personas y el volumen es bajo, puede alcanzar.',
          'No dependés de un proveedor y podés exportar a PDF o compartir la hoja con tu contador.',
        ],
      },
      {
        title: 'Dónde Excel suele quedarse corto',
        paragraphs: [
          'Historial de reparaciones por equipo, fotos, estados del ticket y responsables: en una hoja se vuelve frágil y propenso a errores.',
          'Stock en tiempo real, movimientos entre ubicaciones y alertas de repuestos suelen requerir fórmulas y disciplina que no siempre se mantienen.',
          'La facturación electrónica (por ejemplo ARCA/AFIP en Argentina) exige certificados, punto de venta y trazabilidad: un software de taller integra eso en flujos de cobro, una planilla no.',
        ],
      },
      {
        title: 'Cuándo tiene sentido un software como JC ONE FIX',
        paragraphs: [
          'Cuando varias personas tocan tickets, inventario y caja y necesitás una sola fuente de verdad.',
          'Cuando querés cobrar desde el mismo lugar donde cerrás la orden y, en Argentina, pedir CAE con tu certificado sin copy-paste manual.',
          'Cuando necesitás informes (técnicos, ventas, tiempos) sin armar pivots cada vez.',
        ],
      },
      {
        title: 'Conclusión',
        paragraphs: [
          'No hay “ganador” universal: depende del tamaño del taller y del dolor que tengas hoy. Si la planilla ya te frena, probá un gestor con prueba gratuita y medí si recuperás tiempo y errores.',
        ],
      },
    ],
    faqs: [
      {
        question: '¿Puedo seguir usando Excel para algunas cosas?',
        answer:
          'Sí. Muchos talleres usan software para operación diaria y Excel para análisis puntuales o lo que el contador pida. Lo importante es no duplicar datos críticos sin criterio.',
      },
      {
        question: '¿JC ONE FIX reemplaza a mi contador?',
        answer:
          'No. El software ayuda a operar el taller y a emitir comprobantes cuando corresponde; el asesoramiento impositivo y contable sigue siendo de un profesional.',
      },
    ],
  },
  {
    slug: 'software-taller-argentina-facturacion-afip-arca',
    metaTitle: 'Software de taller en Argentina con facturación electrónica AFIP / ARCA',
    metaDescription:
      'Qué buscar en un gestor de taller si necesitás CAE, punto de venta y certificado ARCA. Enfoque para monotributo y talleres de reparación.',
    h1: 'Software de taller en Argentina y facturación electrónica (AFIP / ARCA)',
    lead:
      'Si facturás en Argentina, el software no solo tiene que “verse lindo”: tiene que encajar con tu CUIT, condición frente al IVA, punto de venta y certificado digital. Esto es lo que conviene revisar antes de elegir.',
    updated: '2026-04-06',
    sections: [
      {
        title: 'Datos del taller coherentes con AFIP',
        paragraphs: [
          'El CUIT y la condición frente al IVA del emisor tienen que estar bien cargados: influyen en el tipo de comprobante (A, B, C, etc.).',
          'Los datos del cliente (CUIT/DNI y condición IVA) también: un error ahí es una de las causas más comunes de rechazo al pedir CAE.',
        ],
      },
      {
        title: 'Certificado y punto de venta',
        paragraphs: [
          'Necesitás el certificado que AFIP te habilita para el web service y el número de punto de venta alineado con lo que diste de alta.',
          'Es habitual probar primero en homologación y pasar a producción cuando estés seguro; un buen panel te deja alternar sin reinstalar nada.',
        ],
      },
      {
        title: 'Qué aporta JC ONE FIX en este contexto',
        paragraphs: [
          'JC ONE FIX está pensado para talleres de reparación (tickets, stock, TPV) y, para organizaciones en Argentina, incluye flujo para integrar ARCA en el cobro cuando el servidor está correctamente configurado.',
          'La operación sigue siendo tuya: el software reduce fricción; la obligación fiscal y el cumplimiento los define tu situación ante AFIP.',
        ],
      },
    ],
    faqs: [
      {
        question: '¿Con monotributo puedo facturar electrónico desde el taller?',
        answer:
          'Depende de tu categoría y de lo que tengas habilitado en AFIP. El software puede automatizar el pedido de CAE cuando los datos y el certificado son correctos; la viabilidad fiscal la confirma AFIP y tu asesor.',
      },
      {
        question: '¿Hace falta algo en el servidor del proveedor del software?',
        answer:
          'Para guardar certificados cifrados y hablar con los servicios de AFIP, quien hospeda la aplicación debe tener variables de entorno configuradas (clave de cifrado y token del SDK). Sin eso, el taller no podrá completar la integración aunque la pantalla exista.',
      },
    ],
  },
  {
    slug: 'alternativas-gestion-taller-reparacion-electronicos',
    metaTitle: 'Alternativas de software para gestión de taller de reparación de electrónica',
    metaDescription:
      'Criterios para elegir alternativas a planillas o herramientas sueltas: tickets, repuestos, clientes y cobros. Incluye enfoque para celulares, microsoldadura y electrónica.',
    h1: 'Alternativas para gestionar un taller de reparación de electrónica',
    lead:
          'Si buscás “alternativas” a lo que usás hoy (Excel, WhatsApp suelto, otro sistema), la clave no es el nombre de la marca sino si el flujo encaja con cómo trabajás: recepción, diagnóstico, repuestos y entrega.',
    updated: '2026-04-06',
    sections: [
      {
        title: 'Qué debería tener un buen sistema para tu vertical',
        paragraphs: [
          'Órdenes de trabajo con estados claros (ingresó, en diagnóstico, en reparación, listo, entregado) y responsable asignado.',
          'Inventario de repuestos con movimientos y, si aplica, ubicaciones o sucursales.',
          'Ficha de cliente e historial por equipo (IMEI, modelo, falla recurrente) para no perder contexto.',
          'Cobro en mostrador o TPV alineado con tu país (en Argentina, facturación ARCA si la usás).',
        ],
      },
      {
        title: 'Cómo encaja JC ONE FIX',
        paragraphs: [
          'JC ONE FIX está orientado a talleres de reparación (celulares, electrónica, microsoldadura): módulos de tickets, clientes, inventario, informes y panel de equipo.',
          'No es la única opción del mercado: compará precio, soporte en español, facilidad de uso y si cubren tu país fiscalmente.',
        ],
      },
      {
        title: 'Cómo probar sin arriesgar',
        paragraphs: [
          'Pedí periodo de prueba, cargá un par de tickets reales y un ciclo de stock. Si en una semana no simplificó algo concreto, seguí evaluando otras alternativas.',
        ],
      },
    ],
    faqs: [
      {
        question: '¿Sirve solo para celulares?',
        answer:
          'Está pensado para reparación de dispositivos y electrónica en general; muchos talleres lo usan también para accesorios y servicios asociados. Lo importante es que el flujo de órdenes y stock coincida con tu operación.',
      },
      {
        question: '¿Hay integración con WhatsApp?',
        answer:
          'El producto evoluciona; para funciones concretas conviene revisar la guía del panel o preguntar a soporte. La base suele ser operar bien tickets y clientes dentro del sistema.',
      },
    ],
  },
  {
    slug: 'jc-one-fix-orderry-comparacion-talleres',
    metaTitle: 'JC ONE FIX vs Orderry: diferencias para talleres de reparación',
    metaDescription:
      'Comparación orientativa entre dos enfoques de software para talleres: en qué se parecen, en qué difieren y cómo elegir según país y facturación.',
    h1: 'JC ONE FIX y Orderry: comparación para talleres de reparación',
    lead:
      'Orderry es una plataforma conocida internacionalmente para servicios y reparaciones. JC ONE FIX es un gestor enfocado en talleres de electrónica con fuerte adaptación a operación y, en Argentina, a facturación ARCA/AFIP. Esta página es orientativa: verificá precios y funciones en cada sitio oficial.',
    updated: '2026-04-06',
    sections: [
      {
        title: 'En qué se parecen',
        paragraphs: [
          'Ambos apuntan a digitalizar órdenes de trabajo, clientes y operación del taller en lugar de depender solo de papel o planillas.',
          'Suelen ofrecer prueba o demo para evaluar sin compromiso.',
        ],
      },
      {
        title: 'Dónde suelen diferir',
        paragraphs: [
          'Enfoque regional: facturación y requisitos locales (Argentina vs otros mercados) cambian qué tan “listo” queda el flujo fiscal de un día para el otro.',
          'Idioma y soporte en horario compatible con Latinoamérica puede pesar tanto como la lista de features.',
          'Precios y moneda: compará planes vigentes en las páginas oficiales de cada proveedor.',
        ],
      },
      {
        title: 'Cuándo evaluar JC ONE FIX',
        paragraphs: [
          'Si operás en Argentina y querés encajar ARCA/AFIP con tickets y cobro en el mismo panel.',
          'Si tu taller es de reparación de electrónica / celulares y buscás un flujo alineado a esa vertical.',
        ],
      },
      {
        title: 'Cuándo seguir mirando Orderry u otras opciones',
        paragraphs: [
          'Si tu operación es multi-país con otras prioridades de integración o si encontrás un encaje mejor con tus procesos actuales.',
        ],
      },
    ],
    faqs: [
      {
        question: '¿Esta comparación está patrocinada por Orderry?',
        answer:
          'No. Es contenido editorial de JC ONE FIX. Los nombres de terceros se usan porque la gente los busca; los datos comerciales pueden cambiar: contrastá siempre con la web oficial.',
      },
      {
        question: '¿Puedo migrar desde otro sistema?',
        answer:
          'Depende de qué datos exportes (clientes, stock). En muchos casos se hace carga inicial manual o por importaciones parciales. Preguntá a soporte qué formatos aceptan hoy.',
      },
    ],
  },
  {
    slug: 'gestor-taller-celulares-servicio-tecnico-argentina',
    metaTitle:
      'Gestor de taller para servicio técnico de celulares en Argentina | JC ONE FIX',
    metaDescription:
      'Qué buscar en un programa de gestión para taller de celulares en Argentina: tickets con IMEI, stock, presupuestos, TPV y facturación ARCA. Guía práctica y cómo probar JC ONE FIX.',
    h1: 'Gestor de taller para servicio técnico de celulares en Argentina',
    lead:
      'Si buscás “software para taller de celulares” o un gestor que no sea una planilla suelta, esta guía resume qué funciones importan de verdad cuando el taller está en Argentina: idioma, pesos, flujo de órdenes y, si facturás electrónico, coherencia con AFIP.',
    updated: '2026-04-09',
    sections: [
      {
        title: 'Qué hace distinto a un taller de celulares',
        paragraphs: [
          'No alcanza con “vender”: el núcleo es la orden de reparación con historial por equipo (modelo, IMEI o serie, falla declarada, fotos del ingreso, presupuesto aceptado y estados claros hasta la entrega).',
          'El stock no es solo “cantidad”: son flex, tapas, baterías, ICs y consumibles con referencias que cambian cada temporada; conviene trazabilidad de movimientos y alertas de mínimo, no solo un número en una celda.',
          'La comunicación con el cliente (presupuesto, listo para retirar, garantía) tiene que poder apoyarse en datos del sistema para no pelear con versiones de WhatsApp disparejas.',
        ],
      },
      {
        title: 'Checklist: qué pedirle a un software en Argentina',
        paragraphs: [
          'Tickets con responsable, tiempos y comentarios internos; que el equipo no “se pierda” entre técnicos o turnos.',
          'Cliente con historial: qué aparatos trajo, qué se le cobró, notas y consentimientos cuando aplica.',
          'Cobro en mostrador o TPV con comprobantes alineados a tu situación impositiva; si usás ARCA, que el flujo no sea rellenar AFIP a mano cada vez.',
          'Precios y textos en español, facturación pensada para el mercado local y soporte en horario razonable para Latinoamérica.',
        ],
      },
      {
        title: 'Cómo encaja JC ONE FIX con ese perfil',
        paragraphs: [
          'JC ONE FIX está orientado a talleres de reparación de dispositivos y electrónica: órdenes de trabajo, clientes, inventario, informes y equipo de trabajo en un solo panel.',
          'En Argentina podés encaminar la facturación electrónica en el cobro cuando tu organización y el servidor están correctamente configurados (certificado, punto de venta, datos del cliente). Para el detalle fiscal conviene leer también la guía de facturación en esta misma sección Comparar.',
        ],
      },
      {
        title: 'Errores comunes al elegir',
        paragraphs: [
          'Elegir un POS genérico de rubro “comercio” que no piensa en IMEI, garantías ni estados de reparación: después el taller termina en paralelo en Excel.',
          'Contratar algo “muy barato” sin prueba real: cargá tickets y stock de un día normal antes de comprometerte.',
          'Ignorar la salida de datos: exportar clientes o movimientos para el contador no debería ser un calvario cada mes.',
        ],
      },
      {
        title: 'Próximo paso',
        paragraphs: [
          'Si el checklist te resuena, probá el producto con datos reales durante el periodo de prueba: medí tiempo en recepción, errores en stock y cuántos pasos te lleva cobrar con comprobante.',
          'Ningún software reemplaza criterio de taller ni asesoramiento contable; sí puede bajar fricción cuando el flujo encaja con cómo trabajás hoy.',
        ],
      },
    ],
    faqs: [
      {
        question: '¿Sirve solo para celulares o también para notebooks y consolas?',
        answer:
          'El flujo está pensado para reparación de dispositivos y electrónica en general. Lo decisivo es que las órdenes de trabajo, el stock y el cobro reflejen tu operación; muchos talleres mezclan celulares con otros equipos.',
      },
      {
        question: '¿Es lo mismo que un sistema de facturación suelto?',
        answer:
          'No necesariamente. Un buen gestor de taller une ticket + cliente + repuestos + cobro; la facturación es una parte del cierre, no un programa aparte donde reescribís todo.',
      },
      {
        question: '¿Puedo probar antes de pagar?',
        answer:
          'Sí: en el sitio oficial hay prueba gratuita por tiempo limitado. Usala con tickets y stock reales; si no simplifica algo concreto en pocos días, seguí comparando otras opciones.',
      },
      {
        question: '¿Me garantiza aparecer primero en Google?',
        answer:
          'No. Ningún proveedor serio puede prometer posiciones. Un buen producto y contenido ayudan; el posicionamiento depende también de competencia, enlaces y tiempo. Esta página existe para que quien busca en Argentina entienda si el encaje es bueno.',
      },
    ],
  },
  {
    slug: 'jconefix-vs-sat-network-taller-argentina',
    metaTitle: 'Jconefix vs SAT Network: ¿Por qué migrar a la nube en 2026? 🇦🇷',
    metaDescription:
      'No te quedes atrapado en un sistema lento. Jconefix te ofrece la potencia de SAT Network con la agilidad de la nube. Facturación AFIP integrada y acceso desde el celular. Mirá la comparativa técnica.',
    h1: 'Jconefix vs SAT Network: ¿Cuál es la mejor opción para tu taller en 2026?',
    lead:
      'SAT Network es una solución con trayectoria en gestión de servicio técnico. Jconefix nace en otra generación tecnológica: aplicación web, actualizaciones continuas y foco en talleres de reparación que quieren cobrar, avisar al cliente y ver stock sin saltar entre programas. Esta guía no busca “ganadores”: hablamos de evolución tecnológica y de qué evaluar si tu operación creció y tu herramienta actual ya no acompaña el ritmo.',
    updated: '2026-04-12',
    competitorLabel: 'SAT Network (enfoque típico)',
    comparisonTable: [
      {
        aspect: 'Interfaz',
        jconefix:
          'Diseño actual, responsive: mismo panel en PC, tablet o celular para recepción y taller.',
        competitor:
          'Suele asociarse a experiencias de escritorio o pantallas heredadas; el salto a web moderna depende de la versión y del hardware donde corre.',
      },
      {
        aspect: 'Instalación',
        jconefix:
          'Nube: entrás con navegador, sin instalar ejecutables en cada máquina; backups y despliegues los gestiona el proveedor.',
        competitor:
          'Históricamente ligado a instalación local o servidores en el taller: más control, también más mantenimiento y actualizaciones a coordinar.',
      },
      {
        aspect: 'Facturación',
        jconefix:
          'Flujo orientado a integrar ARCA/AFIP en el cobro cuando tu organización y el servidor están bien configurados (certificado, punto de venta, datos del cliente).',
        competitor:
          'A menudo convive con facturación en otro sistema o pasos manuales: no es “peor”, pero suma tiempo entre ticket y comprobante.',
      },
      {
        aspect: 'Notificaciones',
        jconefix:
          'Canal con el cliente alineado a cómo trabajan los talleres hoy: WhatsApp y avisos desde el flujo del ticket, además de email según configuración.',
        competitor:
          'En muchos despliegues clásicos el eje sigue siendo email o SMS; puede ser suficiente, o quedarse corto si tu cliente solo mira WhatsApp.',
      },
    ],
    whyChange: {
      title: 'Por qué cambiar (o evolucionar) ahora',
      paragraphs: [
        'La velocidad al pedir CAE con AFIP/ARCA no es solo “un clic mágico”: depende de certificado, punto de venta y datos impecables. Lo que sí cambia con una plataforma nueva es que el ticket, el cliente y el cobro viven en el mismo lugar: menos copy-paste, menos “lo facturo después” y menos errores cuando el mostrador está lleno.',
        'El acceso desde el celular deja de ser un extra: es la mesa de recepción cuando estás en la vitrina, en la sucursal chica o revisando el taller desde casa. Una interfaz pensada para pantalla chica no es moda: es continuidad operativa.',
        'Si hoy tu equipo “hace malabares” entre el sistema de órdenes, el de facturación y el chat con clientes, no es que hayan fallado: es señal de que la pila tecnológica merece una capa más integrada. Jconefix apuesta a esa capa para talleres de reparación en Argentina.',
      ],
    },
    sections: [
      {
        title: 'Cómo leer esta comparación sin sesgos',
        paragraphs: [
          'Los nombres comerciales sirven para que encuentres esta página cuando buscás alternativas; las filas de la tabla describen arquetipos (“software local clásico” vs “SaaS web”) más que atacar a una empresa.',
          'Lo que importa es tu taller: volumen de ingresos, si facturás electrónico todos los días, cuántas personas tocan el mismo ticket y si el cliente te escribe por WhatsApp. Con eso en mente, la tabla te ayuda a marcar checklists.',
        ],
      },
      {
        title: 'Qué tiene sentido probar en una semana',
        paragraphs: [
          'Creá tickets reales con fotos, asignación y estados; mové stock de un repuesto que sí uses; hacé un cobro de prueba con el flujo que usarías en producción.',
          'Si al cabo de esos días no ganaste tiempo o claridad, seguí comparando. La migración tiene costo humano: solo vale la pena si el nuevo flujo se siente más liviano que el anterior.',
        ],
      },
    ],
    faqs: [
      {
        question: '¿Es difícil pasar mis datos de SAT Network a Jconefix?',
        answer:
          'Depende de qué puedas exportar hoy (clientes, listas de precios, stock). En muchos talleres la migración es mixta: importación parcial desde Excel o CSV donde el formato lo permita, más carga asistida de lo que no venga en archivo limpio. No prometemos “un botón y listo” sin ver tus datos: lo que sí ofrecemos es acompañamiento razonable y herramientas como importación inteligente desde planillas cuando estén disponibles en tu cuenta. Escribinos con una muestra anonimizada y te decimos qué es realista en tu caso.',
      },
      {
        question: '¿Jconefix reemplaza al contador o a AFIP?',
        answer:
          'No. El software agiliza operación y, cuando corresponde, el trámite de comprobantes electrónicos; el cumplimiento fiscal y las decisiones impositivas siguen siendo tuyas y de tu asesor. AFIP/ARCA valida cada solicitud según tus datos y certificados.',
      },
      {
        question: '¿Y si mi taller no está solo en Argentina?',
        answer:
          'Jconefix está muy orientado al taller de reparación con realidad argentina (pesos, ARCA, idioma). Si operás multi-país, compará también regulaciones y soporte en cada mercado.',
      },
    ],
  },
  {
    slug: 'jconefix-vs-lider-gestion-taller-argentina',
    metaTitle: 'Alternativa a Líder Gestión: Jconefix es más simple y rápido 🇦🇷',
    metaDescription:
      '¿Cansado de menús complicados? Jconefix es el software para talleres que prioriza tu tiempo. Gestión de órdenes y facturación ARCA sin vueltas. Compará y elegí modernidad.',
    h1: 'Jconefix vs Líder Gestión: evolución y agilidad para tu servicio técnico',
    lead:
      'Líder Gestión es un nombre que muchos talleres conocen: suele asociarse a un abanico amplio de módulos y recorridos pensados para cubrir de todo. El costo lateral es conocido: más pantallas, más clics y la sensación de “laberinto” cuando solo querés cerrar una orden o facturar sin perder el hilo. Jconefix apuesta a otra curva: simplicidad operativa para el día a día del service — sin menospreciar a quien prefiere profundidad clásica; hablamos de evolución tecnológica y de encaje con equipos que valoran velocidad sobre complejidad innecesaria.',
    updated: '2026-04-12',
    competitorLabel: 'Líder Gestión (enfoque habitual)',
    comparisonTable: [
      {
        aspect: 'Curva de aprendizaje',
        jconefix:
          'Flujo guiado: en minutos podés crear ticket, cliente y cobro sin recorrer diez menús; la interfaz prioriza lo que el taller usa cada hora.',
        competitor:
          'Los ERP o suites amplias suelen ofrecer muchas funciones a la vez: más pantallas y permisos hasta que el equipo interioriza el recorrido diario.',
      },
      {
        aspect: 'Acceso móvil',
        jconefix:
          'Web responsive: mismo panel en celular o tablet para recepción, sin depender de escritorio remoto.',
        competitor:
          'En muchos despliegios tradicionales el uso móvil es limitado o pasa por acceso remoto al PC del taller, con fricción extra.',
      },
      {
        aspect: 'Facturación ARCA',
        jconefix:
          'Cobro y comprobante en el mismo flujo cuando tu organización y el servidor están bien configurados (certificado, punto de venta, datos del cliente).',
        competitor:
          'No es raro que la facturación viva en otro módulo o sistema: más pasos entre “orden lista” y “CAE en mano”.',
      },
      {
        aspect: 'Actualizaciones',
        jconefix:
          'En la nube: mejoras y parches se despliegan sin que cada PC descargue instaladores.',
        competitor:
          'Las soluciones locales o híbridas a veces exigen descargas, reinicios o coordinación con soporte para poner al día cada puesto.',
      },
    ],
    whyChange: {
      title: 'Por qué simplificar ahora',
      paragraphs: [
        'Si sentís que perdés más tiempo cargando datos que reparando equipos, el problema no es tu equipo: es la burocracia digital. Jconefix reduce pasos entre ingreso, diagnóstico, repuesto y cobro para que el taller fluya más rápido.',
        'La simplicidad no es “menos potencia”: es ordenar la complejidad detrás de escena para que en el mostrador veas solo lo necesario. ARCA/ARCA sigue exigiendo datos correctos; lo que cambia es cuántas veces los reescribís entre sistemas.',
      ],
    },
    sections: [
      {
        title: 'Simplicidad vs. complejidad: cómo leerlo sin drama',
        paragraphs: [
          'Un sistema “complejo” puede ser excelente para una empresa que necesita docenas de módulos integrados. Un taller chico o mediano que vive del throughput de reparaciones a veces paga demasiado en clics por esa amplitud.',
          'Esta página no dice que Líder Gestión “está mal”: dice que, si tu dolor es el laberinto de menús, conviene probar un enfoque más liviano antes de resignarse.',
        ],
      },
      {
        title: 'Señales de que merecés menos fricción',
        paragraphs: [
          'Tu técnico evita cargar el ticket completo y anota en papel.',
          'Facturás “después” porque el módulo de comprobantes está a tres sistemas de distancia.',
          'Capacitar a alguien nuevo lleva días solo en navegación, no en criterio de taller.',
        ],
      },
      {
        title: 'Qué medir en la prueba gratuita',
        paragraphs: [
          'Cronometrá: ingreso de orden + aviso al cliente + pedido de CAE (en entorno de prueba o datos reales según tu caso). Si en una semana no bajó el tiempo percibido, seguí evaluando alternativas.',
        ],
      },
    ],
    faqs: [
      {
        question: '¿Puedo traer mi stock de Líder Gestión?',
        answer:
          'En muchos casos sí. Si podés exportar tu inventario a Excel (o CSV) desde Líder Gestión, el importador inteligente del panel (Configuración → Importar desde Excel) te sugiere el mapeo de columnas y valida antes de confirmar. Así reducís el riesgo de perder códigos o cantidades en la transición. Si el export no existe o viene en un formato raro, contactá soporte con una muestra anonimizada y te indicamos el camino más realista.',
      },
      {
        question: '¿Es difícil pasar clientes y tickets históricos?',
        answer:
          'Depende de qué puedas exportar hoy. Suele ser mixto: importación parcial de maestros (clientes, repuestos) más carga manual de lo que no venga en archivo limpio. No prometemos migración instantánea sin ver tus datos; sí herramientas y acompañamiento razonable.',
      },
      {
        question: '¿Jconefix reemplaza al contador o a AFIP?',
        answer:
          'No. El software ordena la operación y, cuando corresponde, el trámite de comprobantes; el cumplimiento fiscal sigue siendo tuyo y de tu asesor.',
      },
    ],
  },
];

export function getAllCompararPages(): CompararPageDef[] {
  return pages;
}

export function getCompararPage(slug: string): CompararPageDef | undefined {
  return pages.find((p) => p.slug === slug);
}

export function getCompararSlugs(): string[] {
  return pages.map((p) => p.slug);
}

/** Texto corto para OG / WhatsApp: parte antes del primer «:» en el H1 (ej. «Jconefix vs SAT Network»). */
export function getCompararOgHeadline(page: CompararPageDef): string {
  const idx = page.h1.indexOf(':');
  const raw = (idx > 0 ? page.h1.slice(0, idx) : page.h1).trim();
  return raw || page.metaTitle;
}

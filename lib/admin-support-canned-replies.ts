/**
 * Plantillas para el chat de soporte (super admin): ganar tiempo mientras se investiga.
 */

export type CannedReplySection = {
  id: string;
  label: string;
  description?: string;
  defaultOpen: boolean;
  items: string[];
};

export const CANNED_REPLY_SECTIONS: CannedReplySection[] = [
  {
    id: 'tiempo',
    label: 'Recibir y ganar tiempo',
    description: 'El cliente ve que estás ahí mientras revisas.',
    defaultOpen: true,
    items: [
      'Hola, gracias por escribirnos. Ya estamos con tu mensaje.',
      'Perfecto, te leímos. Dame un momento que lo reviso con calma.',
      'Gracias por los datos. Estoy mirando tu caso ahora mismo.',
      'Recibido. Te respondo en unos minutos con novedades.',
      'Estamos revisando lo que comentas; en breve te escribimos.',
      'Un segundo, estoy comprobando en el sistema lo que nos indicas.',
      'Gracias por tu paciencia; seguimos en ello.',
      'Te confirmo que tu mensaje quedó registrado y lo estamos atendiendo.',
      'Estoy revisando con el equipo técnico; en cuanto tenga respuesta clara te escribo.',
      'Dame unos instantes, quiero asegurarme de darte la solución correcta.',
    ],
  },
  {
    id: 'pedir',
    label: 'Pedir información',
    description: 'Capturas, entorno, pasos.',
    defaultOpen: true,
    items: [
      '¿Podrías enviarnos una captura de pantalla de lo que ves o del mensaje de error?',
      '¿Nos indicas qué navegador usas (Chrome, Edge, Safari, Firefox) y si es ordenador o móvil?',
      '¿Podrías decirnos en qué sección del panel ocurre (Tickets, Facturación, etc.)?',
      '¿Te pasa siempre o solo en algún caso concreto? Cualquier detalle ayuda.',
      'Si puedes, indícanos la hora aproximada en que viste el fallo.',
      '¿Probaste desde otro dispositivo o red (por ejemplo datos móviles) para descartar bloqueos?',
      'Para ubicar mejor el caso: nombre del taller y un teléfono o email de contacto.',
      '¿Tienes el número de ticket o de factura a mano? Así lo localizamos antes.',
    ],
  },
  {
    id: 'pasos',
    label: 'Pasos rápidos (cliente)',
    description: 'Lo típico antes de ir a fondo.',
    defaultOpen: false,
    items: [
      'Prueba cerrar sesión en el panel y volver a entrar con tu usuario.',
      'Actualiza la página (F5) o fuerza recarga con Ctrl+F5 (Cmd+Shift+R en Mac).',
      'Te recomendamos borrar caché del navegador o probar en una ventana de incógnito.',
      'Comprueba que la conexión a internet sea estable y vuelve a intentarlo.',
      'Revisa en Configuración que tu usuario tenga permisos para esa función.',
      'Mira en Configuración → Guía de usuario por si hay un paso documentado para eso.',
      'Si usas la app móvil, prueba también desde el navegador (o al revés) para comparar.',
    ],
  },
  {
    id: 'estado',
    label: 'Estado / incidencias',
    defaultOpen: false,
    items: [
      'Estamos comprobando con el equipo técnico; te avisamos en cuanto tengamos novedades.',
      'Hay una incidencia o mantenimiento conocido; el servicio debería volver a la normalidad en breve.',
      'Desde aquí no reproducimos el fallo; ¿nos cuentas paso a paso qué haces justo antes?',
      'Puede ser un comportamiento esperado en algunos casos; en el siguiente mensaje te explico cómo evitarlo.',
      'Tu comentario quedó registrado; gracias por ayudarnos a mejorar el producto.',
    ],
  },
  {
    id: 'cierre',
    label: 'Cierre y seguimiento',
    defaultOpen: false,
    items: [
      '¿Quedó resuelto de tu lado? Si algo no encaja, escríbenos sin problema.',
      'Incidencia resuelta. ¿Puedes confirmar que ya te funciona correctamente?',
      'El ajuste ya está aplicado desde nuestro lado; cuando puedas, prueba y nos confirmas.',
      '¿Necesitas algo más?',
      'Quedamos a tu disposición por este mismo chat.',
      'Saludos cordiales y buen día.',
    ],
  },
];

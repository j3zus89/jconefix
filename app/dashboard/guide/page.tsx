'use client';

import { useState, useRef, useEffect, Suspense, type ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  ChevronRight, BookOpen, Wrench, Users, Package, ShoppingCart, BarChart3,
  CreditCard, Settings, Ticket, UserPlus, Search, Archive, FileText,
  Receipt, Banknote, Camera, Bell, MessageSquare, Globe, Shield,
  Printer, Zap, Star, AlertTriangle, CheckCircle2, Info, ChevronDown, ChevronUp,
  LayoutDashboard, HelpCircle, ArrowRight, Home, Landmark,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   TIPOS Y DATOS
───────────────────────────────────────────── */

type Section = {
  id: string;
  icon: React.ElementType;
  title: string;
  color: string;
  content: Topic[];
};

/** Ilustración representativa (SVG en /public/guide). Sustituible por capturas PNG reales con el mismo nombre de archivo. */
type GuideFigure = {
  src: string;
  alt: string;
  caption: string;
};

type Topic = {
  id: string;
  title: string;
  emoji?: string;
  tags?: string[]; // 'ar' | 'es' | 'ambos'
  body: React.ReactNode;
  /** Si existe, sustituye al mapa global por tema. */
  figure?: GuideFigure;
};

const TAG_LABEL: Record<string, { label: string; color: string }> = {
  ar: { label: '🇦🇷 Argentina', color: 'bg-sky-100 text-sky-700' },
  es: { label: '🇪🇸 España', color: 'bg-amber-100 text-amber-700' },
  ambos: { label: '🌍 Universal', color: 'bg-emerald-100 text-emerald-700' },
};

/* ─────────────────────────────────────────────
   COMPONENTES AUXILIARES
───────────────────────────────────────────── */

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg bg-[#0d9488]/8 border border-[#0d9488]/20 px-4 py-3 my-3">
      <Zap className="h-4 w-4 mt-0.5 shrink-0 text-[#0d9488]" />
      <span className="text-sm text-gray-700 leading-relaxed">{children}</span>
    </div>
  );
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 my-3">
      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
      <span className="text-sm text-gray-700 leading-relaxed">{children}</span>
    </div>
  );
}

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="mt-2 space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0d9488] text-[10px] font-bold text-white mt-0.5">
            {i + 1}
          </span>
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ol>
  );
}

function KeyVal({ items }: { items: [string, ReactNode][] }) {
  return (
    <div className="mt-2 grid gap-y-2">
      {items.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[180px_1fr] gap-x-4 text-sm">
          <span className="font-semibold text-gray-800 self-start pt-px">{k}</span>
          <div className="text-gray-600 leading-relaxed">{v}</div>
        </div>
      ))}
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto my-3 rounded-lg border border-gray-200">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2.5 text-gray-700 leading-relaxed">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GuideFigureBlock({ figure }: { figure: GuideFigure }) {
  return (
    <figure className="my-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm ring-1 ring-gray-900/5">
      <div className="flex items-center gap-2 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white px-3 py-2">
        <Camera className="h-4 w-4 shrink-0 text-[#0d9488]" aria-hidden />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          Referencia visual del panel
        </span>
      </div>
      <div className="bg-slate-100/60 p-2 sm:p-3">
        {/* <img> en lugar de next/image: los SVG locales fallan menos y respetan CSP img-src 'self' */}
        <img
          src={figure.src}
          alt={figure.alt}
          width={880}
          height={480}
          loading="lazy"
          decoding="async"
          className="mx-auto h-auto w-full max-w-full rounded-lg border border-white bg-white shadow-md object-contain"
        />
      </div>
      <figcaption className="border-t border-gray-100 bg-gray-50/90 px-4 py-3 text-xs leading-relaxed text-gray-600">
        {figure.caption}
      </figcaption>
    </figure>
  );
}

/** Ilustración por id de tema (wireframes con colores JC ONE FIX). */
const TOPIC_FIGURES: Record<string, GuideFigure> = {
  bienvenida: {
    src: '/guide/guide-welcome.png',
    alt: 'Esquema del panel de bienvenida JC ONE FIX',
    caption: 'Vista conceptual del panel: barra superior en verde corporativo y área de trabajo clara.',
  },
  'configuracion-inicial': {
    src: '/guide/guide-panel-config.png',
    alt: 'Pantalla de ajustes generales del taller',
    caption: 'En Configuración organizas nombre del taller, moneda, empleados y métodos de pago antes de operar.',
  },
  'panel-dashboard': {
    src: '/guide/guide-panel-inicio.png',
    alt: 'Dashboard con KPIs y gráfico de actividad',
    caption:
      'En modo completo el inicio une POS (mostrador), cobros de reparación y señas en el período elegido; gráfico diario, torta de métodos de pago y KPIs comparten la misma ventana de fechas.',
  },
  'experiencia-panel': {
    src: '/guide/guide-panel-config.png',
    alt: 'Ajustes del panel: experiencia sencilla o completa',
    caption:
      'En Configuración → Ajustes generales, sección «Experiencia del panel», eliges modo sencillo o completo; el cambio se guarda al instante.',
  },
  region: {
    src: '/guide/guide-region.png',
    alt: 'Comparación de opciones España y Argentina',
    caption: 'La moneda y la organización determinan campos fiscales (IVA, CUIT, GDPR, etc.).',
  },
  'ticket-concepto': {
    src: '/guide/guide-panel-tickets.png',
    alt: 'Lista de tickets de reparación',
    caption: 'Los tickets concentran estado, técnico asignado, tipo de tarea y seguimiento hasta la entrega.',
  },
  'ticket-crear': {
    src: '/guide/guide-panel-tickets.png',
    alt: 'Formulario y lista de tickets',
    caption: 'Reparaciones → Nuevo ticket abre el alta; Administrar tickets muestra filtros y búsqueda.',
  },
  'ticket-ficha': {
    src: '/guide/guide-panel-ticket-ficha.png',
    alt: 'Ficha de ticket con columna principal y lateral',
    caption: 'La ficha une dispositivo, precio, comentarios, piezas, imágenes y cobro en un solo flujo.',
  },
  'ticket-seguimiento-retraso': {
    src: '/guide/guide-panel-ticket-ficha.png',
    alt: 'Ficha de ticket: bloque de seguimiento por retraso',
    caption:
      'En estados de espera (piezas, presupuesto, pendiente cliente…) aparece el bloque para motivo de espera y posponer avisos.',
  },
  'ticket-estados': {
    src: '/guide/guide-panel-tickets.png',
    alt: 'Tickets con indicadores de estado',
    caption: 'Los estados se cambian desde la ficha o la lista; personalízalos en Configuración.',
  },
  'ticket-cobro': {
    src: '/guide/guide-panel-ticket-ficha.png',
    alt: 'Zona de totales y cobro en la ficha',
    caption: 'Desde la ficha generas presupuesto, factura y registras cobros vinculados al ticket.',
  },
  'ticket-imagenes': {
    src: '/guide/guide-panel-ticket-ficha.png',
    alt: 'Secciones de la ficha incluyendo adjuntos',
    caption: 'Antes/después y adjuntos viven en pestañas de la ficha para documentar la reparación.',
  },
  'clientes-gestion': {
    src: '/guide/guide-panel-clientes.png',
    alt: 'Listado de clientes con búsqueda',
    caption: 'Clientes muestra tu listado; usa la búsqueda o el filtro por URL (?q=).',
  },
  'clientes-crear': {
    src: '/guide/guide-panel-clientes.png',
    alt: 'Alta de cliente en el panel',
    caption: 'Nuevo cliente recoge datos de contacto y fiscales según tu país.',
  },
  'clientes-rgpd': {
    src: '/guide/guide-panel-clientes.png',
    alt: 'Datos del cliente y cumplimiento',
    caption: 'En España verás campos GDPR; en Argentina el foco está en CUIT y condición IVA.',
  },
  'clientes-leads': {
    src: '/guide/guide-panel-clientes.png',
    alt: 'Leads y conversión a cliente',
    caption: 'Los leads se gestionan antes de convertirlos en clientes definitivos.',
  },
  'clientes-importar-excel': {
    src: '/guide/guide-panel-config.png',
    alt: 'Ajustes: importar clientes y órdenes desde Excel',
    caption:
      'El import inteligente vive en Ajustes → Importar desde Excel; desde Clientes podés subir .xlsx con el mismo motor (solo contactos).',
  },
  'inventario-repuestos': {
    src: '/guide/guide-panel-inventario.png',
    alt: 'Cuadrícula de repuestos y stock',
    caption: 'Inventario controla SKU, stock mínimo y enlaces a órdenes de compra.',
  },
  'inventario-filtros-repuestos': {
    src: '/guide/guide-panel-inventario.png',
    alt: 'Zona de filtros del inventario de repuestos',
    caption: 'Categoría, marca, modelo y proveedor con listas buscables; criterios opcionales y guardado de filtros.',
  },
  'inventario-servicio-reparacion': {
    src: '/guide/guide-panel-inventario.png',
    alt: 'Listado de servicios de reparación y precios de mano de obra',
    caption:
      'Tarifas por región (AR/EUR), filtros por categoría/marca/modelo; Apple iPhone con precio distinto por modelo tras importar el catálogo 2026.',
  },
  'inventario-importar': {
    src: '/guide/guide-panel-import-excel.png',
    alt: 'Modal de importación de Excel con mapeo inteligente de columnas',
    caption:
      'El asistente detecta automáticamente cada columna, muestra el nivel de confianza (Seguro / Probable / Posible) y un ejemplo de valor real para que podés revisar y confirmar antes de importar.',
  },
  'inventario-ordenes': {
    src: '/guide/guide-panel-inventario.png',
    alt: 'Órdenes de compra a proveedores',
    caption: 'Las OCs complementan el stock que consumes en tickets y POS.',
  },
  'inventario-transferencias': {
    src: '/guide/guide-panel-inventario.png',
    alt: 'Movimientos entre almacenes',
    caption: 'Las transferencias mueven cantidades entre ubicaciones si las usas.',
  },
  'pos-nueva-venta': {
    src: '/guide/guide-panel-pos.png',
    alt: 'Pantalla del punto de venta con carrito',
    caption: 'POS suma líneas, descuentos e impuestos; el total se cobra y puede abrir cajón.',
  },
  'pos-caja': {
    src: '/guide/guide-panel-pos.png',
    alt: 'Cobro y métodos de pago en POS',
    caption: 'Efectivo, tarjeta y transferencia se registran desde el flujo de venta.',
  },
  'pos-historial': {
    src: '/guide/guide-panel-pos.png',
    alt: 'Historial de ventas POS',
    caption: 'Ventas recientes y totales por día aparecen en informes y en el resumen.',
  },
  'factura-crear': {
    src: '/guide/guide-panel-facturas.png',
    alt: 'Editor de factura con líneas',
    caption: 'Facturas enlaza cliente, líneas, IVA y estado de cobro.',
  },
  'factura-imprimir': {
    src: '/guide/guide-panel-facturas.png',
    alt: 'Vista de impresión de factura',
    caption: 'Imprime o envía PDF según la plantilla y datos del taller.',
  },
  'factura-estados': {
    src: '/guide/guide-panel-facturas.png',
    alt: 'Listado de facturas y estados',
    caption: 'Pendiente, pagada o anulada: el listado filtra por estado y fechas.',
  },
  'factura-iva-es': {
    src: '/guide/guide-panel-facturas.png',
    alt: 'Factura con IVA España',
    caption: 'Con moneda EUR e IVA 21 % el documento muestra base e impuesto.',
  },
  'factura-iva-ar': {
    src: '/guide/guide-panel-factura-ar.png',
    alt: 'Creación de factura Argentina con elección entre electrónica AFIP e interna',
    caption: 'Al crear una factura en Argentina elegís la modalidad: Electrónica AFIP (CAE oficial, numeración de AFIP, validez fiscal) o Solo registro interno (numeración interna INV-###, sin efecto ante el fisco). Las dos series nunca se mezclan.',
  },
  'config-arca': {
    src: '/guide/guide-panel-arca.png',
    alt: 'Pantalla de Certificados y entorno ARCA con upload de .p12, CUIT detectado y test de conexión paso a paso',
    caption: 'Subís el certificado .p12, el sistema valida el CUIT y la fecha de vencimiento al instante. "Probar conexión AFIP" ejecuta 4 pasos y muestra ✅/❌ en tiempo real. "Factura de prueba" valida el flujo completo contra homologación.',
  },
  'gastos-crear': {
    src: '/guide/guide-panel-gastos.png',
    alt: 'Registro de gastos del taller',
    caption: 'Gastos alimenta el control de caja y los informes de margen.',
  },
  'gastos-categorias': {
    src: '/guide/guide-panel-gastos.png',
    alt: 'Categorías de gastos',
    caption: 'Clasificar por categoría mejora el análisis mensual.',
  },
  'informes-resumen': {
    src: '/guide/guide-panel-informes.png',
    alt: 'Gráficos de informes',
    caption: 'Informes agrega ventas, reparaciones y KPIs seleccionando rango de fechas.',
  },
  'informes-tecnicos': {
    src: '/guide/guide-panel-informes.png',
    alt: 'Rendimiento por técnico',
    caption: 'Compara cierres y tiempos por técnico cuando la organización lo permite.',
  },
  'config-general': {
    src: '/guide/guide-panel-config.png',
    alt: 'Pestaña de configuración general',
    caption: 'Aquí viven nombre comercial, moneda, pie de factura y opciones generales.',
  },
  'config-empleados': {
    src: '/guide/guide-panel-config.png',
    alt: 'Gestión de empleados y roles',
    caption: 'Empleados, técnicos y permisos se administran desde Configuración.',
  },
  'config-qz': {
    src: '/guide/guide-panel-config.png',
    alt: 'Ajustes de impresión QZ Tray',
    caption: 'QZ Tray permite impresión directa y cajón desde el navegador.',
  },
  'config-notificaciones': {
    src: '/guide/guide-panel-config.png',
    alt: 'Campana de notificaciones en la barra superior',
    caption:
      'Con avisos pendientes la campana se balancea cada pocos segundos y, al volver a la pestaña, intenta mostrarse en pantalla; el pitido avisa la primera vez que llega un aviso nuevo.',
  },
  'config-whatsapp': {
    src: '/guide/guide-panel-config.png',
    alt: 'Integración WhatsApp',
    caption: 'Plantillas y envío rápido desde la ficha del ticket.',
  },
  'herr-busqueda': {
    src: '/guide/guide-panel-busqueda.png',
    alt: 'Barra de búsqueda global del panel',
    caption: 'La barra superior filtra clientes o tickets al pulsar Enter.',
  },
  'herr-ia': {
    src: '/guide/guide-panel-ia.png',
    alt: 'Mejorar o pulir texto con IA (Groq)',
    caption:
      'En tickets y en el envío rápido de WhatsApp, la IA de redacción usa Groq en el servidor; el presupuesto automático para WhatsApp puede usar Gemini en la infraestructura del servicio.',
  },
  'herr-portal': {
    src: '/guide/guide-panel-portal.png',
    alt: 'Vista del portal del cliente',
    caption: 'El portal ofrece seguimiento del ticket según lo actives en ajustes.',
  },
  'herr-clock': {
    src: '/guide/guide-panel-clock.png',
    alt: 'Pantalla de fichaje con empleado, PIN y descansos',
    caption:
      'Reloj: fichaje por empleado (si no hay ninguno, se usa tu cuenta), PIN, descansos, notas y planilla guardada en el sistema.',
  },
  'herr-chat': {
    src: '/guide/guide-panel-chat.png',
    alt: 'Hilo de chat interno',
    caption: 'Chat del equipo: nombres según Mi perfil y menciones con @.',
  },
  'herr-soporte': {
    src: '/guide/guide-panel-soporte.png',
    alt: 'Conversación con soporte',
    caption: 'El widget de soporte combina bot y atención humana del equipo JC ONE FIX.',
  },
  'factura-estados-afip': {
    src: '/guide/guide-panel-estados-afip.png',
    alt: 'Listado de facturas con columna de estado AFIP: Aprobada, Pendiente, Fallida e interna',
    caption: 'Cada factura electrónica en Argentina muestra su estado AFIP: ✅ Aprobada (con CAE), 🟡 Pendiente (reconciliación automática cada 5 min) o ❌ Fallida. Las facturas internas aparecen como «Registro interno» sin proceso AFIP.',
  },
  'factura-interna-ar': {
    src: '/guide/guide-panel-factura-ar.png',
    alt: 'Toggle de modalidad: Electrónica AFIP vs Solo registro interno',
    caption: 'Elegís la modalidad al crear cada factura. La serie AFIP (Factura A/B/C con CAE) y la serie interna (INV-####) son completamente independientes y nunca se mezclan: el sistema lo asegura.',
  },
  'herr-afip-checklist': {
    src: '/guide/guide-panel-afip-checklist.png',
    alt: 'Checklist paso a paso para el primer usuario AFIP en el panel',
    caption: 'Desde el panel: CUIT, condición IVA, certificado .p12, punto de venta, prueba en homologación, factura de prueba y recién entonces producción. Si el test falla sin motivo claro, contactá a soporte.',
  },
  'config-arca-troubleshoot': {
    src: '/guide/guide-panel-arca-troubleshoot.png',
    alt: 'Tabla de errores AFIP comunes con causa y solución en español',
    caption: 'El panel traduce los errores técnicos de AFIP/ARCA a mensajes claros en español. Si el problema persiste, contactá a soporte para revisar el historial del envío.',
  },
};

function figureForTopic(t: Topic): GuideFigure | undefined {
  return t.figure ?? TOPIC_FIGURES[t.id];
}

/* ─────────────────────────────────────────────
   CONTENIDO DE LA GUÍA
───────────────────────────────────────────── */

const GUIDE_SECTIONS: Section[] = [
  /* ══════════ 1. PRIMEROS PASOS ══════════ */
  {
    id: 'inicio',
    icon: Home,
    title: 'Primeros pasos',
    color: '#0d9488',
    content: [
      {
        id: 'bienvenida',
        title: 'Bienvenido a JC ONE FIX',
        emoji: '👋',
        tags: ['ambos'],
        body: (
          <>
            <p className="text-sm text-gray-700 leading-relaxed">
              <strong>JC ONE FIX</strong> es el sistema de gestión integral para talleres de reparación
              electrónica. Desde aquí controlarás tickets de reparación, clientes, inventario, ventas,
              facturación, gastos e informes, todo en un solo panel sin necesidad de instalar nada adicional.
            </p>
            <Tip>Guarda en favoritos la URL de tu panel para acceder rápido cada mañana.</Tip>
            <KeyVal items={[
              ['URL del panel', 'jconefix.com.ar/dashboard (o app.jconefix.com si usás ese host)'],
              ['Usuario', 'El email con el que te registraste'],
              ['Datos en la nube', 'Almacenados de forma cifrada, con copias de seguridad automáticas.'],
              ['Acceso desde móvil', 'Sí — diseño responsive completo'],
            ]} />
          </>
        ),
      },
      {
        id: 'configuracion-inicial',
        title: 'Configuración inicial recomendada',
        emoji: '🛠️',
        tags: ['ambos'],
        body: (
          <>
            <p className="text-sm text-gray-700 mb-2">Sigue estos pasos en tu primer acceso para dejar el sistema listo:</p>
            <Steps items={[
              'Menú Configuración → Configuración general: rellena el nombre del taller, dirección, teléfono y moneda (€ para España, ARS para Argentina).',
              'En esa misma página (encabezado «Ajustes generales»), sección «Experiencia del panel»: elige modo sencillo (menú reducido e inicio simplificado) o modo completo (todos los módulos). Al pulsar la opción se guarda de inmediato en la nube.',
              'Menú de usuario (arriba a la derecha) → Mi perfil: cada empleado debe rellenar nombre y apellidos en Información personal; es el nombre que verá el equipo en el chat interno.',
              'Reloj de entrada / salida: si trabajas solo y aún no creaste empleados, al abrir el reloj el sistema genera un registro vinculado a tu usuario para que puedas fichar; también puedes dar de alta técnicos en Configuración → Equipo / empleados y asignarles PIN de fichaje.',
              'Configuración → Estado del ticket: revisa o personaliza los estados de reparación.',
              'Configuración → Métodos de pago: activa los que usas (efectivo, tarjeta, transferencia, QR, Mercado Pago, etc.).',
              'Si operas en Argentina (moneda ARS): en Configuración general indica la condición IVA del taller y, si vas a emitir comprobantes electrónicos AFIP, sube los certificados en la sección «Certificados y entorno ARCA» (punto de venta, homologación o producción). Usá siempre primero homologación y «Probar conexión» antes de facturar en producción.',
              'Clientes → Nuevo cliente: crea tus primeros clientes o importa desde CSV.',
              'Reparaciones → Nuevo ingreso (recepción guiada) o Nuevo ticket: registra tu primera reparación.',
            ]} />
            <Warn>Si no configuras la moneda antes de crear facturas, todas aparecerán en € (Euro). Cambia la moneda desde Configuración → Configuración general.</Warn>
          </>
        ),
      },
      {
        id: 'experiencia-panel',
        title: 'Modo sencillo y modo completo',
        emoji: '🧭',
        tags: ['ambos'],
        body: (
          <>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              Puedes adaptar el panel al tamaño de tu taller. El modo no cambia tus datos: solo el menú superior y la pantalla de{' '}
              <strong>Inicio</strong>.
            </p>
            <Table
              headers={['', 'Modo sencillo', 'Modo completo']}
              rows={[
                [
                  'Enfoque',
                  'Lo esencial: nuevo ingreso, tickets, clientes y ventas con menos opciones en el menú.',
                  'Todos los módulos: inventario, informes, gastos y submenús completos.',
                ],
                [
                  'Inicio',
                  'Vista reducida con accesos directos y contadores de trabajos activos.',
                  'Resumen con KPIs, curva y tabla diaria (POS + cobros de reparación), torta de formas de pago (POS + reparaciones) y últimos trabajos.',
                ],
                [
                  'Menú',
                  'Oculta Inventario, Informes y Gastos para reducir ruido.',
                  'Muestra la barra de navegación completa del producto.',
                ],
              ]}
            />
            <p className="text-sm text-gray-700 leading-relaxed mt-3">
              <strong>Dónde cambiarlo:</strong>{' '}
              <Link href="/dashboard/settings?tab=config_general" className="font-medium text-[#0d9488] hover:underline">
                Configuración → Configuración general
              </Link>
              {' '}(pantalla «Ajustes generales»), sección <strong>Experiencia del panel</strong>. Al elegir Sencillo o Completo el valor se guarda al instante; no hace falta pulsar el botón general de guardar de la página solo por este cambio.
            </p>
            <Tip>
              Empieza en modo sencillo si quieres formar al equipo poco a poco; pasa a completo cuando necesites stock avanzado,
              informes o gastos.
            </Tip>
          </>
        ),
      },
      {
        id: 'panel-dashboard',
        title: 'Panel de inicio (Dashboard)',
        emoji: '📊',
        tags: ['ambos'],
        body: (
          <>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              En <strong>modo completo</strong>, la página de inicio es un tablero operativo: eliges el <strong>período</strong>{' '}
              (hoy, esta semana, este mes, etc.) y, si hay varias personas en el taller, puedes filtrar por quien cobró o cargó
              la venta en caja.
            </p>
            <KeyVal items={[
              ['KPIs (España / EUR u otros)', 'Hasta ocho indicadores: ingreso total (POS + cobros de tickets en el período), POS, tickets cobrados, descuentos, servicios completados, cuentas por cobrar, etc.'],
              ['KPIs (Argentina)', 'Cuatro tarjetas: ingreso del período (mostrador + reparaciones cobradas), solo ventas POS en mostrador/caja, cobrado en reparaciones (pagos en caja + señas registradas en órdenes creadas en ese período) y trabajos del período.'],
              ['Gráfico principal', 'En la mayoría de regiones: ventas POS frente a COGS si aplica. En Argentina la curva muestra ingresos diarios combinando punto de venta y cobros de reparación del período (sin COGS).'],
              ['Tabla diaria', 'Mismos totales que el gráfico: por día suma POS y reparaciones; columnas de descuento e IVA reflejan sobre todo el mostrador (las reparaciones suman en venta/neto).'],
              ['Formas de pago (caja)', 'Torta y leyenda: mezcla ventas POS y cobros de reparación (efectivo, tarjeta, etc.). La seña solo en campo «Seña» del ticket aparece como «Seña / anticipo» si no duplicaste ese cobro como pago.'],
              ['Columna lateral', 'Resumen de tickets/reparaciones por estado (pendientes, en curso, completados en el período).'],
              ['Últimos trabajos', 'Lista corta de tickets recientes (no depende del filtro de fechas del resumen).'],
            ]} />
            <Warn>
              El resumen del inicio es <strong>operativo</strong> (caja y taller en el período elegido). No sustituye libros ni
              obligaciones ante AEAT, AFIP/ARCA u otros organismos: usa siempre tu asesoría fiscal para liquidaciones oficiales.
            </Warn>
            <p className="text-sm text-gray-700 leading-relaxed mt-3">
              En <strong>modo sencillo</strong> no verás este tablero: el inicio muestra el nombre del taller, el botón destacado{' '}
              <strong>Nuevo ingreso</strong>, contadores de pendientes/en curso/activos y accesos a tickets, clientes y nueva
              venta. Puedes activar el panel completo cuando lo necesites (véase el tema anterior).
            </p>
          </>
        ),
      },
      {
        id: 'region',
        title: 'Diferencias por región: España vs Argentina',
        emoji: '🌍',
        tags: ['ambos'],
        body: (
          <>
            <p className="text-sm text-gray-700 mb-2">
              JC ONE FIX adapta automáticamente el idioma fiscal y los campos según la región de operación del taller
              (derivada sobre todo de la moneda en ajustes).
            </p>
            <Table
              headers={['Concepto', '🇪🇸 España', '🇦🇷 Argentina']}
              rows={[
                ['Moneda', 'Euro (€)', 'Peso Argentino ($)'],
                ['Identificación fiscal', 'NIF / CIF / DNI / NIE', 'CUIT / CUIL / DNI'],
                ['Impuesto', 'IVA 21%', 'IVA (AFIP/ARCA)'],
                ['Campo cliente ID', 'NIF/CIF', 'CUIT'],
                ['RGPD (GDPR)', 'Visible y obligatorio', 'Oculto (no aplica)'],
                ['Condición IVA cliente', 'No aplica', 'Monotributo, RI, Exento…'],
                ['Garantía en impreso', 'Según normativa española', 'Adaptado a normativa AR'],
                ['Prefijo teléfono', '+34', '+54'],
                [
                  'Factura electrónica (AFIP/ARCA)',
                  'No integrado',
                  'Opcional: con certificados válidos y backend configurado, el panel solicita CAE al cobrar en tickets y permite emitir electrónicamente o solo registrar venta interna al crear facturas desde Mis ventas.',
                ],
              ]}
            />
            <Tip>
              El panel toma la región operativa sobre todo por la <strong>moneda</strong> del taller (EUR vs ARS) y alinea el
              país guardado en Ajustes con esa elección. Así las etiquetas (ticket vs orden), el huso horario y los textos
              fiscales no quedan desalineados.
            </Tip>
          </>
        ),
      },
      {
        id: 'esquema-datos-enlace',
        title: 'Cómo se relacionan clientes, tickets y facturas',
        emoji: '🔗',
        tags: ['ambos'],
        body: (
          <>
            <p className="text-sm text-gray-700 mb-2">
              No hace falta saber de bases de datos para usar el panel. Este resumen solo explica, en lenguaje corriente, qué
              piezas encajan entre sí cuando trabajás en el día a día.
            </p>
            <KeyVal
              items={[
                [
                  'Organización',
                  <>
                    Es tu taller en el sistema: nombre comercial, logo, país y moneda, y las personas con acceso al panel
                    (propietario, administradores, técnicos, etc.).
                  </>,
                ],
                [
                  'Ajustes del taller',
                  <>
                    Moneda y símbolo, zona horaria, métodos de pago, notificaciones, seguimiento por retraso en tickets, portal
                    del cliente, impresión QZ, datos de contacto en facturas, etc. Todo se guarda en la misma zona de{' '}
                    <strong>Configuración</strong>.
                  </>,
                ],
                [
                  'Ticket de reparación',
                  <>
                    Cada ticket pertenece a un <strong>cliente</strong> y muestra el número visible (T-…). Podés vincular un
                    ticket nuevo a uno anterior (garantía o reingreso) para dejar claro el historial. Las fechas de garantía
                    suelen completarse al facturar y en la ficha el equipo las ve como referencia.
                  </>,
                ],
                [
                  'Facturas',
                  <>
                    Las facturas de cobro pueden ir ligadas al <strong>ticket</strong> y al <strong>cliente</strong>. En
                    Argentina, si emitís electrónicamente, el panel gestiona CAE, QR y numeración oficial; si elegís solo
                    registro interno, queda una numeración aparte, sin mezclarse con AFIP.
                  </>,
                ],
                [
                  'Integración AFIP (Argentina)',
                  <>
                    El certificado y el punto de venta los cargás en <strong>Configuración → Impuestos y AFIP</strong>; el
                    sistema los guarda de forma segura. Si el panel acepta el certificado pero no obtenés CAE al probar o al
                    cobrar, contactá a soporte: puede haber un tema en la instalación del servicio.
                  </>,
                ],
                [
                  'Devolución al cliente',
                  <>
                    Al registrar una devolución en la ficha del ticket queda una <strong>constancia</strong> con referencia tipo
                    DEV-…; podés listarlas e imprimirlas desde <strong>Finanzas → Devoluciones al cliente</strong>. Si anulás
                    la devolución en el ticket, desaparece del listado activo.
                  </>,
                ],
              ]}
            />
            <Warn>
              Si tras una actualización del sistema alguna pantalla muestra un error raro o no carga datos, anotá el mensaje,
              probá recargar la página y, si sigue igual, <strong>contactá a soporte JC ONE FIX</strong> con captura de pantalla
              y nombre del taller.
            </Warn>
          </>
        ),
      },
    ],
  },

  /* ══════════ 2. REPARACIONES / TICKETS ══════════ */
  {
    id: 'tickets',
    icon: Wrench,
    title: 'Reparaciones & Tickets',
    color: '#0d9488',
    content: [
      {
        id: 'ticket-concepto',
        title: 'Qué es un ticket de reparación',
        emoji: '🎫',
        tags: ['ambos'],
        body: (
          <>
            <p className="text-sm text-gray-700 leading-relaxed">
              Un ticket es el registro central de una reparación. Contiene todo lo que ocurre
              desde que el dispositivo entra hasta que sale: diagnóstico, repuestos usados,
              imágenes, cobro, historial de comentarios y estado.
            </p>
            <KeyVal items={[
              [
                'Número de caso',
                'En España y la mayoría de regiones el panel habla de «ticket»; en Argentina (ARS) suele mostrarse como «orden». El código único (ej. T-00123) se imprime en la etiqueta del dispositivo.',
              ],
              ['Estado', 'Flujo del dispositivo: Entrada → En proceso → Reparado → Entregado.'],
              ['Prioridad', 'Normal, Alta o Urgente. Los urgentes aparecen marcados en rojo en todas las listas.'],
              ['Tipo de tarea', 'TIENDA, ONLINE, DOMICILIO, GARANTÍA, EMPRESA.'],
              ['Asignado a', 'Técnico responsable. Recibe notificación en la campana al ser asignado.'],
            ]} />
          </>
        ),
      },
      {
        id: 'ticket-crear',
        title: 'Cómo crear un ticket nuevo',
        emoji: '➕',
        tags: ['ambos'],
        body: (
          <>
            <Steps items={[
              'Ve a Reparaciones → Nuevo ticket.',
              'Busca o selecciona el cliente (también puedes crear uno nuevo desde ahí).',
              'Rellena los datos del dispositivo: tipo, marca, modelo, IMEI o número de serie.',
              'Describe la avería en el campo "Descripción del problema".',
              'Selecciona el técnico asignado si ya lo sabes.',
              'Elige el estado inicial (normalmente "Entrada") y el tipo de tarea.',
              'Añade el precio estimado si puedes calcularlo en ese momento.',
              'Haz clic en "Guardar". El sistema asigna el número de ticket automáticamente (secuencia por organización).',
            ]} />
            <Tip>Puedes guardar el ticket como <strong>borrador</strong> si aún te falta información. Los borradores no aparecen en las estadísticas hasta que se publican.</Tip>
            <Warn>El PIN/patrón de desbloqueo del dispositivo se guarda cifrado. Solo lo verá el técnico asignado y el propietario de la cuenta.</Warn>
          </>
        ),
      },
      {
        id: 'ticket-administrar-lista',
        title: 'Administrar tickets (listado)',
        emoji: '📑',
        tags: ['ambos'],
        figure: TOPIC_FIGURES['ticket-crear'],
        body: (
          <>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              En <strong>Reparaciones → Administrar tickets</strong> ves el listado paginado con filtros, búsqueda, agrupación por
              fechas y casillas para acciones masivas. Cada fila enlaza al número de orden/ticket para abrir la ficha.
            </p>
            <KeyVal items={[
              ['Columna Acciones', 'Iconos de editar (lápiz) y eliminar (papelera): están siempre visibles al final de la fila.'],
              ['Editar', 'Abre el mismo flujo que la ficha para corregir datos rápidos sin entrar por el enlace del número.'],
              ['Eliminar', 'Solicita confirmación; usa con cuidado en producción.'],
              ['WhatsApp', 'Botón para iniciar mensaje al teléfono del cliente si está cargado.'],
            ]} />
            <Tip>
              Si el taller usa vista compacta, algunas columnas se ocultan; identificación, cliente, fechas, estado, WhatsApp y
              acciones siguen disponibles.
            </Tip>
          </>
        ),
      },
      {
        id: 'ticket-ficha',
        title: 'Ficha del ticket: qué contiene y cómo usarla',
        emoji: '📋',
        tags: ['ambos'],
        body: (
          <>
            <p className="text-sm text-gray-700 mb-2">La ficha agrupa toda la información en pestañas:</p>
            <Table
              headers={['Pestaña', 'Contenido']}
              rows={[
                ['Tareas', 'Pendientes, diagnóstico, comentarios internos y al cliente'],
                ['Repuestos', 'Añadir o descontar repuestos del stock vinculados a esta reparación'],
                ['Imágenes', 'Fotos de entrada y post-reparación'],
                ['Condiciones', 'Pre y post condición del equipo (pantalla, carcasa, botones…)'],
                ['Accesorios', 'Qué accesorios entregó el cliente junto con el dispositivo'],
                ['Factura', 'Crear, ver y cobrar la factura de esta reparación'],
              ]}
            />
            <KeyVal items={[
              ['Cambiar estado', 'Menú desplegable en la parte superior derecha de la ficha. Cada cambio se registra en el historial.'],
              ['Reasignar técnico', 'En el bloque "Asignado a" haz clic en el nombre del técnico. Se abre un selector con todos los empleados activos.'],
              ['Precio', 'Haz clic en el importe para editarlo en línea. Se actualiza precio estimado y final a la vez.'],
              ['Imprimir ficha', 'Botón de impresora en la barra superior. Genera un PDF/impreso de taller.'],
              ['Imprimir etiqueta', 'Icono de etiqueta. Imprime la pegatina con QR para pegar al dispositivo.'],
              ['Mejorar o pulir con IA', 'En diagnóstico, comentarios y envío rápido de WhatsApp hay botones para redactar con IA (Groq); detalle en Herramientas → Mejorar y pulir textos con IA.'],
              ['Seguimiento por retraso', 'En estados de espera verás motivo de espera, posposición de avisos y contador; detalle en el tema siguiente.'],
            ]} />
          </>
        ),
      },
      {
        id: 'ticket-seguimiento-retraso',
        title: 'Seguimiento por retraso (campana)',
        emoji: '⏱️',
        tags: ['ambos'],
        body: (
          <>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              Cuando un ticket queda mucho tiempo en ciertos estados de <strong>espera</strong> (por ejemplo esperando
              piezas, presupuesto o respuesta del cliente), el sistema puede avisar al <strong>técnico asignado</strong> en
              la <strong>campana</strong> para que revise el caso — sin asumir que el retraso es siempre culpa del taller.
            </p>
            <Steps items={[
              'Pon el ticket en un estado de espera aplicable (p. ej. «Pendiente de pieza», «Presupuesto», «Pendiente cliente»). Se inicia un periodo de seguimiento automático.',
              'En la ficha, bloque «Seguimiento por retraso», elige el motivo de espera (pedido/pieza, cliente, proveedor, garantía, otro). Eso ajusta el plazo antes del primer aviso.',
              'Si necesitas silenciar avisos unos días, usa «Posponer avisos» (+3 o +7 días) o quita la posposición cuando quieras volver a evaluar.',
              'Los avisos se repiten con un intervalo configurable y hay un máximo por ticket en cada periodo; al salir del estado de espera se reinicia el seguimiento.',
            ]} />
            <KeyVal items={[
              ['Quién lo ve', 'El usuario del panel enlazado al empleado asignado (igual que con la notificación de asignación). Sin enlace de usuario, no hay aviso en campana.'],
              ['Chip en la campana', 'Las entradas aparecen como «Seguimiento» (morado). Al pulsar, abres el ticket.'],
              [
                'Ajustes avanzados',
                'Quien administra el taller puede afinar la función en Configuración: activar o desactivar el seguimiento, qué estados vigilar, cuántos días esperar antes del primer aviso según el motivo, intervalo entre repeticiones y máximo de avisos por periodo.',
              ],
              [
                'Si dejan de llegar avisos o una factura queda «Pendiente» mucho tiempo',
                'Suele resolverse solo en unos minutos (reconciliación automática). Si se alarga, contactá a soporte: ellos revisan el servicio.',
              ],
            ]} />
            <Tip>
              Documenta en comentarios internos el contexto del retraso; el motivo de espera ayuda al sistema y al equipo a priorizar sin señalar al técnico por defecto.
            </Tip>
          </>
        ),
      },
      {
        id: 'ticket-estados',
        title: 'Estados del ticket y flujo de trabajo',
        emoji: '🔄',
        tags: ['ambos'],
        body: (
          <>
            <p className="text-sm text-gray-700 mb-2">El flujo habitual es:</p>
            <div className="flex flex-wrap items-center gap-2 my-3">
              {['Entrada', 'En estudio', 'Presupuesto', 'En proceso', 'Esperando piezas', 'Reparado', 'No reparado', 'Entregado'].map((s, i, arr) => (
                <div key={s} className="flex items-center gap-1.5">
                  <span className="rounded-full bg-[#0d9488]/10 px-2.5 py-1 text-xs font-semibold text-[#0d9488] border border-[#0d9488]/20">{s}</span>
                  {i < arr.length - 1 && <ArrowRight className="h-3 w-3 text-gray-400" />}
                </div>
              ))}
            </div>
            <KeyVal items={[
              ['Entrada', 'El dispositivo acaba de llegar al taller. Estado por defecto.'],
              ['En estudio', 'El técnico está diagnosticando la avería.'],
              ['Presupuesto', 'Se ha enviado un presupuesto al cliente y esperamos confirmación.'],
              ['En proceso', 'Reparación en curso.'],
              ['Esperando piezas', 'Se han pedido repuestos. El dispositivo espera en el taller.'],
              ['Reparado', 'La reparación está lista para entregar.'],
              ['No reparado', 'No ha sido posible reparar. Se devuelve al cliente.'],
              ['Entregado', 'El dispositivo ya se entregó. Estado final.'],
            ]} />
            <Tip>Puedes personalizar los estados desde Configuración → Estado del ticket. Incluso puedes añadir colores y nombres propios.</Tip>
          </>
        ),
      },
      {
        id: 'ticket-cobro',
        title: 'Cobrar una reparación',
        emoji: '💳',
        tags: ['ambos'],
        body: (
          <>
            <p className="text-sm text-gray-700 mb-2">Flujo habitual:</p>
            <Steps items={[
              'Abre la ficha del ticket → pestaña Factura.',
              'Crea la factura con el botón Nueva factura y añade las líneas (descripción, cantidad, precio).',
              'Pulsa Cobrar, elige método (efectivo, tarjeta, transferencia, combinado, etc.) y confirma.',
              'Con efectivo puedes indicar lo entregado y el sistema calcula el cambio.',
              'La factura pasa a Pagada y puedes marcar el ticket como Entregado.',
            ]} />
            <p className="text-sm text-gray-700 leading-relaxed mt-4 mb-1 font-semibold text-gray-800">
              Argentina (ARS) con certificados ARCA en el panel
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">
              En el momento del cobro el panel puede solicitar el <strong>CAE</strong> a ARCA/AFIP antes de finalizar: crea la
              factura con sus líneas, autoriza el comprobante y solo entonces registra el pago enlazado a esa factura. Si la
              autorización falla, se muestra el mensaje de ARCA/AFIP y <strong>no</strong> queda un cobro registrado sobre una
              factura sin CAE por ese intento (se revierte el borrador asociado).
            </p>
            <Tip>
              Mientras el cobro indica que está procesando (emisión ARCA), mantén el modal abierto hasta que finalice para no
              interrumpir la solicitud.
            </Tip>
            <Tip>Si tienes QZ Tray, el cajón puede abrirse al cobrar en efectivo.</Tip>
            <Tip>
              El importe en campo <strong>Seña</strong> del ticket cuenta como dinero ya ingresado al calcular cuánto falta cobrar
              y en el resumen de inicio; si además registrás esa seña como pago en caja, vaciá el campo seña en el ticket para no
              contar dos veces el mismo efectivo en informes.
            </Tip>
            <Warn>
              En todos los países necesitas el identificador fiscal del taller (NIF/CIF en España, CUIT en Argentina) en
              Configuración general. Para obtener CAE en Argentina también necesitás certificados ARCA válidos en el panel y
              que la prueba de conexión AFIP haya dado bien. Si el cobro no termina de autorizar y el mensaje no es claro,
              contactá a soporte.
            </Warn>
          </>
        ),
      },
      {
        id: 'ticket-imagenes',
        title: 'Imágenes del ticket',
        emoji: '📸',
        tags: ['ambos'],
        body: (
          <>
            <p className="text-sm text-gray-700 mb-2">
              La pestaña <strong>Imágenes</strong> tiene dos categorías:
            </p>
            <KeyVal items={[
              ['Pre-reparación', 'Fotos del estado del dispositivo al entrar. Protege ante reclamaciones.'],
              ['Post-reparación', 'Fotos después de reparar para demostrar el trabajo realizado.'],
            ]} />
            <Tip>Arrastra imágenes directamente desde tu escritorio o haz clic en el área de subida. El sistema las almacena de forma segura en la nube.</Tip>
          </>
        ),
      },
      {
        id: 'ticket-devoluciones',
        title: 'Devolución al cliente y tickets vinculados',
        emoji: '↩️',
        tags: ['ambos'],
        body: (
          <>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              Desde la <strong>ficha del ticket</strong> (barra superior, junto a cobros) puedes registrar una{' '}
              <strong>devolución al cliente</strong>: dinero, equipo, mixto, abono en tienda, garantía, etc.
              El formulario incluye tipo de actuación, forma de liquidación, texto obligatorio, importe monetario opcional
              y enlace opcional a una <strong>factura del mismo ticket</strong> (mismo caso de reparación).
            </p>
            <Steps items={[
              'Abre el ticket → botón de devolución → describe qué se devuelve y elige tipo y liquidación.',
              'Guarda: queda el registro en el ticket y se genera o actualiza la constancia asociada (una constancia activa por ticket mientras la devolución siga vigente).',
              'Cuando entregues al cliente, pulsa «Ya se lo devolví» para cerrar el ciclo operativo.',
              'Imprime la constancia desde el modal o desde Finanzas → Devoluciones al cliente → Imprimir.',
            ]} />
            <KeyVal items={[
              [
                'Constancia impresa',
                'Usa el mismo estilo visual que la factura (cabecera con logo del taller desde Ajustes, datos de contacto, tabla de concepto y total). Es un documento interno: no sustituye notas de crédito ni requisitos fiscales oficiales.',
              ],
              [
                'Listado global',
                <>
                  <Link href="/dashboard/devoluciones" className="font-medium text-[#0d9488] hover:underline">
                    Finanzas → Devoluciones al cliente
                  </Link>
                  {' '}muestra todas las constancias con enlace al ticket e impresión.
                </>,
              ],
              [
                'Reingreso / ticket padre',
                'En recepción o al crear un ticket puedes vincular un ticket anterior (garantía o reingreso). En la ficha verás la relación con el trabajo previo para no perder el hilo del caso.',
              ],
            ]} />
            <Warn>
              Si al guardar aparece un error o la pantalla no responde como debería, probá de nuevo más tarde y, si persiste,
              contactá a soporte con el mensaje que muestra el panel.
            </Warn>
          </>
        ),
      },
    ],
  },

  /* ══════════ 3. CLIENTES ══════════ */
  {
    id: 'clientes',
    icon: Users,
    title: 'Clientes',
    color: '#2563eb',
    content: [
      {
        id: 'clientes-gestion',
        title: 'Gestión de la base de clientes',
        emoji: '👥',
        tags: ['ambos'],
        body: (
          <>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              El módulo de clientes centraliza toda la información de tus clientes y su historial de reparaciones.
              Desde la lista puedes buscar, filtrar, exportar e importar masivamente.
            </p>
            <KeyVal items={[
              ['Búsqueda rápida', 'Nombre, correo o teléfono en el campo de búsqueda global (barra superior) o en la lista de clientes.'],
              ['Grupos', 'Particular, Empresa, VIP, Mayorista. Útil para aplicar condiciones especiales.'],
              ['Monto en listado', 'Suma de importes de las órdenes/tickets del cliente (coste final o estimado). En Argentina la columna se llama «Monto de órdenes».'],
              ['Saldo pendiente', 'Lo que falta cobrar: se tienen en cuenta la seña del ticket, los pagos registrados en caja y si el cobro está marcado como pagado. No es lo mismo que el total facturado si ya cobraste todo.'],
              ['Historial', 'Columna de entradas: recuento de órdenes vinculadas al cliente.'],
              ['Exportar', 'Menú «CSV / Excel» para descargar la lista filtrada o todos.'],
              [
                'Importar',
                <>
                  Botón <strong className="text-gray-800">CSV / Excel</strong>: el <strong>.csv</strong> usa el mapeo clásico;
                  el <strong>.xlsx / .xls</strong> usa el mismo motor inteligente que Ajustes → Importar desde Excel (solo
                  clientes, con validación y deduplicación). El detalle operativo está en el tema siguiente,{' '}
                  <strong className="text-gray-800">Importar clientes y órdenes desde Excel</strong>.
                </>,
              ],
            ]} />
            <Tip>
              La seña puede cargarse solo en el ticket o también como pago en caja: si hacés las dos cosas con el mismo dinero,
              poné la seña en <strong>0</strong> en el ticket cuando ya exista el cobro, para que listados y resumen no dupliquen montos.
            </Tip>
          </>
        ),
      },
      {
        id: 'clientes-importar-excel',
        title: 'Importar clientes y órdenes desde Excel',
        emoji: '📊',
        tags: ['ambos'],
        body: (
          <>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              Hay <strong>dos entradas</strong> al mismo flujo de lectura robusta de celdas y sugerencia de columnas:{' '}
              <strong>Ajustes → Importar desde Excel</strong> (elegís si traés solo contactos o contactos + órdenes/boletos)
              y <strong>Clientes → CSV / Excel</strong> con un archivo <strong>.xlsx / .xls</strong>, que importa{' '}
              <strong>solo clientes</strong> sin pasar por el menú de ajustes.
            </p>
            <Steps items={[
              'Elegí modo en Ajustes si migrás historial completo: «Clientes y órdenes» (recomendado) o «Solo clientes».',
              'Subí el archivo (.xlsx o .xls). Solo se usa la primera hoja; fila 1 = cabeceras. Filas totalmente vacías no entran.',
              'Revisá el mapeo: el sistema propone columnas según títulos típicos (nombre, teléfono, correo, documento, orden, IMEI, etc.). Corregí lo que no coincida.',
              'Pulsa «Validar (vista previa)» y resolvé errores fila por fila antes de «Importar ahora».',
            ]} />
            <KeyVal items={[
              [
                'Deduplicación',
                'Si el correo o el documento ya existen, la fila reutiliza ese contacto y puede completar campos vacíos (teléfono, dirección, etc.). Con el mismo teléfono, solo se unifica cuando el nombre es igual o muy parecido (evita que el número del taller mezcle a distintas personas).',
              ],
              [
                'Filas vs contactos distintos',
                'El resumen muestra cuántas filas se procesaron y cuántos contactos distintos intervinieron. Si hay menos contactos que filas, varias filas apuntaron al mismo cliente (misma clave); no es un fallo. Si esperabas más filas que las que cuenta el archivo, revisá filas vacías bajo la cabecera.',
              ],
              [
                'Errores parciales',
                'Si algo falla al crear un cliente o un boleto, el aviso aparece en «Última importación» y el toast sale en advertencia (no solo en verde): revisá el listado de filas con error.',
              ],
              [
                'Límite',
                'Hasta 1000 filas con datos por importación en la primera hoja.',
              ],
            ]} />
            <Tip>
              Página pública con orientación y palabras clave para buscadores:{' '}
              <Link href="/ayuda/importar-datos-taller" className="font-medium text-[#0d9488] hover:underline">
                /ayuda/importar-datos-taller
              </Link>
              .
            </Tip>
          </>
        ),
      },
      {
        id: 'clientes-crear',
        title: 'Crear y editar un cliente',
        emoji: '👤',
        tags: ['ambos'],
        body: (
          <>
            <Steps items={[
              'Clientes → Nuevo cliente.',
              'Rellena nombre, apellido (o nombre de empresa si es B2B) y teléfono.',
              'Añade email si quieres enviarle notificaciones automáticas al cambiar el estado del ticket.',
              'Completa la dirección para facturas.',
              'Selecciona el tipo de documento y número fiscal.',
              'Guarda. El sistema crea automáticamente el perfil del cliente.',
            ]} />
            <KeyVal items={[
              ['España', 'Tipo de doc: DNI, NIE, Pasaporte, Número SS. Campo RGPD visible (consentimiento GDPR requerido).'],
              ['Argentina', 'Tipo de doc: CUIT, CUIL, DNI, Pasaporte. Sin campo RGPD.'],
            ]} />
            <Tip>Puedes crear un cliente directamente desde el formulario de nuevo ticket sin salir de él.</Tip>
          </>
        ),
      },
      {
        id: 'clientes-rgpd',
        title: 'RGPD / GDPR (solo España y UE)',
        emoji: '🔒',
        tags: ['es'],
        body: (
          <>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              El Reglamento General de Protección de Datos (RGPD) exige que los talleres en España
              obtengan el consentimiento explícito del cliente para tratar sus datos personales.
            </p>
            <KeyVal items={[
              ['Dónde está', 'Formulario de crear/editar cliente → sección "Configuración" → checkbox "Conformidad con GDPR".'],
              ['Qué hace', 'Marca al cliente como conforme con el tratamiento de datos según el RGPD.'],
              ['Lista de clientes', 'Columna "RGPD" con icono verde (conforme) o rojo (no conforme).'],
              ['Ajustes de GDPR', 'Configuración → GDPR: texto legal personalizable.'],
            ]} />
            <Warn>Sin este consentimiento marcado no deberías almacenar ni usar los datos del cliente para comunicaciones comerciales según la normativa española y europea.</Warn>
          </>
        ),
      },
      {
        id: 'clientes-leads',
        title: 'Clientes potenciales (Leads)',
        emoji: '🎯',
        tags: ['ambos'],
        body: (
          <>
            <p className="text-sm text-gray-700 leading-relaxed">
              <strong>Clientes → Clientes potenciales</strong> muestra el registro de contactos
              que aún no han traído ningún dispositivo a reparar. Es el pipeline de captación.
            </p>
            <Tip>Convierte un lead en cliente activo creando su primer ticket. El lead desaparece automáticamente del listado de potenciales al tener una reparación asociada.</Tip>
          </>
        ),
      },
    ],
  },

  /* ══════════ 4. INVENTARIO ══════════ */
  {
    id: 'inventario',
    icon: Package,
    title: 'Inventario',
    color: '#7c3aed',
    content: [
      {
        id: 'inventario-repuestos',
        title: 'Gestión de repuestos y productos',
        emoji: '🔩',
        tags: ['ambos'],
        body: (
          <>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              El inventario controla el stock de repuestos que usas en reparaciones
              y también los productos que vendes en el punto de venta.
            </p>
            <KeyVal items={[
              ['Inventario → Repuestos', 'Lista de todos los productos con stock, precio de costo y precio de venta.'],
              ['Stock mínimo', 'Cuando el stock cae por debajo del mínimo configurado, el producto se marca con alerta.'],
              ['SKU', 'Código interno único. Permite búsquedas rápidas y escáner de código de barras.'],
              ['UPC / Código de barras', 'Para conectar con lectores de código de barras en el POS.'],
              ['Ubicación en almacén', 'Campo "Storage location". Útil para saber en qué cajón o estante está el repuesto.'],
            ]} />
            <Tip>Al vincular un repuesto a un ticket, el stock se descuenta automáticamente. Si el técnico cancela la reparación, puede devolver el repuesto al stock desde la ficha del ticket.</Tip>
            <Tip>
              En la lista puedes seleccionar varios repuestos (casillas y «Acciones masivas»): imprimir etiquetas o eliminar solo del taller, con textos en español.
            </Tip>
            <Tip>
              La tarjeta de <strong>filtros</strong> encima de la tabla (categoría, marca, criterios, guardar filtro, etc.) está detallada en el apartado siguiente, <strong>Filtros y búsqueda de repuestos</strong>.
            </Tip>
          </>
        ),
      },
      {
        id: 'inventario-filtros-repuestos',
        title: 'Filtros y búsqueda de repuestos',
        emoji: '🔎',
        tags: ['ambos'],
        body: (
          <>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              En <strong>Inventario → Repuestos</strong>, la tarjeta superior acota la tabla mientras escribes o eliges valores.
              Los cuadros de texto (ID, nombre, IMEI, número de serie) filtran en vivo. Los campos{' '}
              <strong>Categoría</strong>, <strong>Marca</strong>, <strong>Modelo</strong> y <strong>Proveedor</strong> son{' '}
              listas <strong>multiselección con buscador</strong>: ábrelos, escribe en <strong>Buscar</strong>, marca casillas y
              usa <strong>Seleccionar todo</strong> para todas las opciones visibles después de filtrar.
            </p>
            <KeyVal items={[
              ['Categoría', 'Los valores salen de los repuestos ya guardados. Si escribes rutas con subniveles usando el separador " > " (ejemplo: TELEFONOS > IPHONE), el selector puede mostrar un árbol con flechas para expandir.'],
              ['Marca / Modelo', 'Listas según datos distintos que ya existen en tu inventario.'],
              ['Proveedor', 'Combina los proveedores dados de alta en Inventario → Proveedores con nombres que ya figuren en los productos.'],
              ['SKU/UPC', 'Un solo campo busca en SKU y en código UPC.'],
              ['Condición', 'Filtra por estado del artículo (nuevo, usado, reacondicionado, etc.).'],
              ['Criterios', 'Elige uno o varios criterios extra: filtrar por ubicación física en almacén, por fechas de alta del registro, o solo artículos sin número de serie. Al activarlos aparecen los campos correspondientes.'],
              ['Ocultar sin stock', 'Oculta repuestos con cantidad 0 o negativa.'],
              ['Reiniciar', 'Limpia todos los filtros.'],
              ['Guardar filtro / Guardar filtros', 'Guarda la combinación en este navegador para recuperarla después.'],
              ['Fijar filtros (barra superior)', 'Guarda y hace que, al volver a entrar en Repuestos en este equipo, se apliquen solos los filtros guardados.'],
              ['Buscar', 'Muestra cuántos repuestos coinciden; la tabla ya se actualiza al cambiar los filtros.'],
            ]} />
            <Tip>
              Puedes ocultar toda la tarjeta de filtros con <strong>Ocultar filtros</strong> y recuperarla cuando la necesites.
            </Tip>
          </>
        ),
      },
      {
        id: 'inventario-servicio-reparacion',
        title: 'Servicio de reparación (mano de obra)',
        emoji: '🛠️',
        tags: ['ambos'],
        body: (
          <>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              En <strong>Inventario → Servicio de reparación</strong> defines el <strong>precio de mano de obra</strong>{' '}
              de cada tipo de trabajo (cambio de pantalla, limpieza por humedad, software, etc.) según{' '}
              <strong>categoría</strong>, <strong>marca</strong> y <strong>modelo</strong> del dispositivo.
              Es independiente del stock de repuestos: aquí solo guardas tarifas de labor.
            </p>
            <KeyVal items={[
              ['Ruta', 'Menú superior Inventario → Servicio de reparación.'],
              [
                'Moneda',
                <>
                  Todos los precios son en <strong>pesos argentinos (ARS)</strong>. El catálogo de referencia 2026 se importa
                  en ARS; podés ajustar cada fila manualmente.
                </>,
              ],
              [
                'Filtros',
                'Categoría, marca, modelo y palabra clave (nombre del servicio o código de tipo). «Buscar» aplica; «Reiniciar» limpia. Si filtras por un modelo concreto, también verás filas genéricas «(Todos los modelos)» de esa marca cuando apliquen.',
              ],
              [
                'Tabla',
                'Listado paginado: columna Reg. (AR), precio en ARS, origen Catálogo o Manual, año de tarifa si procede, «Widget», editar / borrar.',
              ],
              ['Selección', 'Casillas por fila y «Eliminar seleccionados» para borrado múltiple.'],
              [
                'Nuevo / editar',
                <>
                  Nombre obligatorio. Precio siempre en <strong>ARS</strong>. Puedes elegir un{' '}
                  <strong>tipo de reparación (plantilla 2026)</strong>: rellena nombre y sugiere un precio base. Para{' '}
                  <strong>Smartphones + Apple</strong>, la sugerencia <strong>depende del modelo</strong> (p. ej. pantalla
                  distinta entre iPhone 7 e iPhone 16). Tras cambiar marca, modelo o tipo, revisa el importe si usas
                  plantilla.
                </>,
              ],
              [
                'Importar catálogo 2026',
                <>
                  Botón <strong>Importar catálogo 2026</strong> en la misma pantalla. Primera confirmación: cantidad de
                  filas; segunda: si <strong>eliminar antes</strong> las filas del catálogo en esa región (recomendado para
                  no duplicar). Genera una fila por categoría, marca y tipo de reparación; en{' '}
                  <strong>Smartphones + Apple</strong> hay <strong>una fila por cada modelo iPhone</strong> del catálogo
                  interno, con precios escalados por generación (pantalla y placa varían más; software y copia de datos
                  comparten base). Otras marcas siguen con modelo «(Todos los modelos)».
                </>,
              ],
              [
                'Exportar Excel',
                'Hasta 10.000 filas según filtros y región activa; incluye columnas útiles para auditoría (región, código de tipo, año, origen).',
              ],
            ]} />
            <Warn>
              Si al usar <strong>Importar catálogo 2026</strong> aparece un error, esperá unos minutos y volvé a intentar. Si
              se repite, contactá a soporte: ellos verifican el servicio.
            </Warn>
            <Tip>
              Si esta pantalla dejó de funcionar después de un cambio grande en el producto, contactá a soporte con captura del
              mensaje de error.
            </Tip>
            <Tip>
              Si importaste el catálogo antes de que existieran precios por modelo Apple, vuelve a importar con{' '}
              <strong>sustituir</strong> filas del catálogo en esa región para reemplazar entradas antiguas «(Todos los
              modelos)» solo-Apple por filas por iPhone. Los servicios creados a mano no se borran con esa opción (solo
              filas con origen catálogo en la región elegida).
            </Tip>
          </>
        ),
      },
      {
        id: 'inventario-importar',
        title: 'Importar inventario desde Excel/CSV',
        emoji: '📥',
        tags: ['ambos'],
        body: (
          <>
            <Steps items={[
              'Inventario → Repuestos → botón "Importar Excel".',
              'Sube un .xlsx o .xls (Square, VIAMOVIL, otro ERP…). El mapeo de columnas es automático.',
              'En los desplegables, muchos encabezados en inglés se muestran con etiqueta en español para que sea más fácil revisar el mapeo.',
              'Si la hoja trae una fila de instrucciones del proveedor (textos largos bajo los títulos), el sistema la detecta y no la importa como producto.',
              'Revisa el mapeo y la vista previa; confirma la importación y revisa el resumen (correctas / errores).',
            ]} />
            <Warn>El nombre del producto es obligatorio. Si falta, puedes mapear «Descripción» y el nombre se deduce de la primera línea cuando sea posible.</Warn>
            <Tip>
              Si los títulos están en una fila bajo texto de ayuda, el asistente intenta localizar la fila de cabeceras sola y te avisa.
            </Tip>
            <Warn>
              Si aun así aparece en la tabla una fila que solo contiene <strong>texto de instrucciones</strong> (a menudo en inglés)
              en lugar de un producto real, bórrala desde el inventario o corrige el archivo y vuelve a importar: no es un fallo del
              catálogo, es una fila de plantilla que entró como dato.
            </Warn>
          </>
        ),
      },
      {
        id: 'inventario-ordenes',
        title: 'Órdenes de compra',
        emoji: '📦',
        tags: ['ambos'],
        body: (
          <>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              Cuando necesitas reponer stock, crea una orden de compra para registrar
              el pedido al proveedor y actualizar el inventario al recibirlo.
            </p>
            <Steps items={[
              'Inventario → Órdenes de compra → Nueva orden.',
              'Selecciona el proveedor.',
              'Añade los productos y cantidades pedidas.',
              'Estado "Pendiente" hasta que llegue el stock.',
              'Al recibir el pedido, cambia el estado a "Recibido". El stock se actualiza automáticamente.',
            ]} />
          </>
        ),
      },
      {
        id: 'inventario-transferencias',
        title: 'Transferencias entre ubicaciones',
        emoji: '↔️',
        tags: ['ambos'],
        body: (
          <>
            <p className="text-sm text-gray-700 leading-relaxed">
              Si tienes varios almacenes o puntos de trabajo, usa <strong>Inventario → Transferencias</strong>
              para mover stock de un lugar a otro. Queda registrado quién lo movió, cuándo y qué cantidad.
            </p>
          </>
        ),
      },
    ],
  },

  /* ══════════ 5. PUNTO DE VENTA ══════════ */
  {
    id: 'pos',
    icon: ShoppingCart,
    title: 'Punto de Venta (POS)',
    color: '#ea580c',
    content: [
      {
        id: 'pos-nueva-venta',
        title: 'Realizar una venta en el POS',
        emoji: '🛒',
        tags: ['ambos'],
        body: (
          <>
            <Steps items={[
              'Punto de venta → Nueva venta.',
              'Busca el producto por nombre, SKU o escanea el código de barras.',
              'Ajusta la cantidad. El sistema muestra el precio y el total en tiempo real.',
              'Selecciona el método de pago.',
              'Completa la venta. El stock se descuenta y la venta queda registrada.',
            ]} />
            <KeyVal items={[
              ['Descuentos', 'Puedes aplicar un porcentaje de descuento por línea o al total.'],
              ['Cliente', 'Asocia la venta a un cliente para incluirla en su historial.'],
              ['Sin cliente', 'Puedes hacer ventas anónimas (venta rápida) sin seleccionar cliente.'],
            ]} />
            <Tip>Si tienes QZ Tray activo, al finalizar la venta se imprime automáticamente el ticket en la impresora térmica.</Tip>
            <Tip>
              En el inicio (modo completo), estas ventas suman en el KPI <strong>mostrador / caja</strong> y en la curva y tabla
              diarias junto con otros ingresos del punto de venta; los <strong>cobros de reparación</strong> se muestran aparte en
              su tarjeta pero comparten gráfico diario, torta de métodos de pago e ingreso total del período. En Argentina el menú
              suele hablar de «mostrador / caja» en lugar de «POS».
            </Tip>
          </>
        ),
      },
      {
        id: 'pos-caja',
        title: 'Cajón portamonedas (Caja registradora)',
        emoji: '💰',
        tags: ['ambos'],
        body: (
          <>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              JC ONE FIX puede abrir el cajón portamonedas automáticamente al cobrar en efectivo.
              Para que funcione necesitas:
            </p>
            <Steps items={[
              'Un cajón conectado a la impresora térmica por cable RJ11.',
              'QZ Tray instalado y en ejecución en el PC del taller.',
              'Configurar el puerto en Configuración → Bandeja QZ (por defecto 8182).',
              'La impresora térmica como impresora predeterminada en Windows/macOS.',
            ]} />
            <KeyVal items={[
              ['Abrir caja manual', 'Botón "Abrir caja" en la barra superior del panel.'],
              ['Apertura automática', 'Al cobrar en efectivo, si QZ Tray está activo y el permiso "Abrir cajón" está activado.'],
              ['POS → Caja registradora', 'Registro de aperturas, cierres de turno y efectivo en caja.'],
            ]} />
            <Warn>El cajón no se reconoce como dispositivo USB. Envía una señal ESC/POS a la impresora para que esta abra el cajón. Sin impresora térmica compatible, no funciona.</Warn>
          </>
        ),
      },
      {
        id: 'pos-historial',
        title: 'Historial de ventas',
        emoji: '📈',
        tags: ['ambos'],
        body: (
          <>
            <p className="text-sm text-gray-700 leading-relaxed">
              En <strong>Punto de venta → Historial de ventas</strong> ves todas las ventas del POS con
              fecha, importe, productos vendidos y método de pago. Puedes filtrar por rango de fechas y exportar a Excel.
            </p>
          </>
        ),
      },
    ],
  },

  /* ══════════ 6. FACTURACIÓN ══════════ */
  {
    id: 'facturacion',
    icon: Receipt,
    title: 'Facturas',
    color: '#0d9488',
    content: [
      {
        id: 'factura-crear',
        title: 'Crear facturas (ticket o Mis ventas)',
        emoji: '🧾',
        tags: ['ambos'],
        body: (
          <>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              Puedes facturar desde la <strong>ficha del ticket</strong> (pestaña Factura) o desde{' '}
              <strong>Finanzas → Facturas emitidas (ventas)</strong> con el botón de nueva factura / administración de facturas.
            </p>
            <p className="text-sm font-semibold text-gray-800 mb-1">Desde el ticket</p>
            <Steps items={[
              'Abre el ticket → pestaña Factura → Nueva factura.',
              'Añade líneas (descripción, cantidad, precio); activa IVA si aplica (España 21 % típico; Argentina según condiciones).',
              'Guarda: se asigna numeración interna. Cobrar desde el mismo flujo (véase Reparaciones → Cobrar una reparación).',
            ]} />
            <p className="text-sm font-semibold text-gray-800 mt-4 mb-1">Desde Mis ventas (factura manual)</p>
            <Steps items={[
              'Abre el listado de facturas de venta y usa la opción para crear una factura nueva.',
              'Elige cliente, fechas, líneas y observaciones como en el editor habitual.',
            ]} />
            <p className="text-sm text-gray-700 leading-relaxed mt-3">
              <strong className="text-gray-800">Argentina (ARS):</strong> antes de guardar verás la elección{' '}
              <em>Emitir factura electrónica (AFIP)</em> frente a <em>Solo registrar venta interna</em>. La opción electrónica
              exige que el cliente tenga <strong>condición IVA</strong> informada; al guardar, si ARCA está bien configurado en
              el panel, se solicita el CAE. Si eliges solo venta interna, la factura queda como comprobante de gestión sin
              CAE (útil si falla la red o AFIP). Los clones de facturas en organizaciones argentinas se crean por defecto como
              internas para evitar duplicar comprobantes electrónicos sin revisar.
            </p>
            <Tip>
              El listado y la administración viven en <strong>Finanzas → Facturas emitidas (ventas)</strong>; el acceso «Administrar
              facturas» desde Reparaciones apunta al mismo módulo.
            </Tip>
          </>
        ),
      },
      {
        id: 'factura-imprimir',
        title: 'Imprimir y enviar facturas',
        emoji: '🖨️',
        tags: ['ambos'],
        body: (
          <>
            <KeyVal items={[
              ['Imprimir en pantalla', 'Botón Imprimir. Abre la vista de impresión del navegador (A4 o térmica según configuración).'],
              ['Impresión directa QZ', 'Si tienes Bandeja QZ activa e impresión directa, envía el documento a la impresora sin el diálogo del navegador.'],
              ['Enviar por email', 'Botón Email: adjunta o enlaza el PDF al correo del cliente cuando está configurado.'],
              ['Enviar por WhatsApp', 'Botón WhatsApp: mensaje pre-rellenado con el resumen.'],
              [
                'Argentina con CAE',
                'En el PDF/impreso aparecen CAE, fecha de vencimiento del CAE, número y tipo de comprobante AFIP y el código QR de verificación según el formato habitual.',
              ],
              [
                'Comprobante interno (AR)',
                'Si la factura es solo registro interno (sin CAE), el impreso muestra un aviso claro de que no es comprobante electrónico AFIP.',
              ],
            ]} />
          </>
        ),
      },
      {
        id: 'factura-estados',
        title: 'Estados de factura y pago',
        emoji: '💸',
        tags: ['ambos'],
        body: (
          <>
            <Table
              headers={['Estado', 'Significado']}
              rows={[
                ['Borrador', 'Factura en preparación, no enviada ni cobrada.'],
                ['Emitida', 'Factura generada y enviada al cliente.'],
                ['Pagada', 'Pago registrado en el sistema.'],
                ['Parcialmente pagada', 'Solo se ha cobrado una parte (pagos a plazos).'],
                ['Cancelada', 'Factura anulada. No computa en informes de ingresos.'],
              ]}
            />
          </>
        ),
      },
      {
        id: 'factura-estados-afip',
        title: 'Estados AFIP de una factura electrónica (Argentina)',
        emoji: '🇦🇷',
        tags: ['ar'],
        body: (
          <>
            <p className="text-sm text-gray-700 leading-relaxed mb-3">
              Las facturas en Argentina con emisión electrónica tienen un estado AFIP adicional que refleja en qué punto
              del proceso con ARCA se encuentra el comprobante. Esto es especialmente importante cuando hay problemas de red
              o timeouts durante el envío.
            </p>
            <Table
              headers={['Estado AFIP', 'Descripción', 'Qué hacer']}
              rows={[
                [
                  '— (sin estado)',
                  'Factura interna o no AR: sin proceso AFIP. Comprobante de gestión, sin CAE.',
                  'Nada. Es normal para facturas internas.',
                ],
                [
                  '🟡 Pendiente',
                  'El sistema reservó el número de comprobante y envió la solicitud a AFIP. Aún no se recibió confirmación. Puede ser un timeout o la respuesta está en camino.',
                  'Esperá 3–5 minutos. La reconciliación automática consulta AFIP cada 5 min y recupera el CAE si fue emitido.',
                ],
                [
                  '✅ Aprobada por AFIP',
                  'AFIP emitió el CAE. El comprobante tiene validez fiscal. En el impreso aparecen el CAE, su vencimiento y el QR de verificación.',
                  'Nada. El proceso está completo.',
                ],
                [
                  '❌ Fallida',
                  'Error definitivo: AFIP rechazó el comprobante o no respondió en más de 4 horas. El número reservado puede quedar desajustado.',
                  'Revisá los mensajes de error. Posiblemente debas corregir datos y emitir un nuevo comprobante.',
                ],
              ]}
            />
            <p className="text-sm font-semibold text-gray-800 mt-4 mb-1">Reconciliación automática</p>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              El sistema ejecuta un <strong>job automático cada 5 minutos</strong> que revisa todas las facturas en estado
              «Pendiente» y consulta a AFIP usando el número de comprobante reservado. Si AFIP ya emitió el CAE (aunque el
              la respuesta se perdió en el camino), lo recupera y actualiza la factura a «Aprobada». Esto resuelve
              automáticamente los casos de timeout sin intervención manual.
            </p>
            <KeyVal items={[
              ['Cuándo actúa', 'Facturas pendientes con más de 3 minutos de antigüedad (para no interferir con envíos en curso).'],
              ['Umbral de fallo', 'Si tras 4 horas AFIP no tiene registro del comprobante, lo marca como fallido para que el operador tome acción.'],
              [
                'Registro técnico',
                'Cada intento queda registrado de forma interna por si soporte necesita ayudarte; en el día a día no tenés que hacer nada.',
              ],
            ]} />
            <Warn>
              Si una factura queda en «Pendiente» más de 10 minutos sin pasar a «Aprobada» o «Fallida», puede indicar
              un problema de conectividad persistente. Revisá el estado del servicio de AFIP y contactá soporte si continúa.
            </Warn>
          </>
        ),
      },
      {
        id: 'factura-interna-ar',
        title: 'Factura interna vs. electrónica AFIP (Argentina)',
        emoji: '📋',
        tags: ['ar'],
        body: (
          <>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              En Argentina, al crear una factura desde <strong>Mis ventas</strong> o al cobrar un ticket, podés elegir entre dos modalidades:
            </p>
            <Table
              headers={['Modalidad', 'CAE', 'Numeración', 'Para qué sirve']}
              rows={[
                [
                  'Electrónica AFIP',
                  'Sí — obtenido de ARCA en tiempo real',
                  'Serie AFIP (numeración oficial por PV y tipo)',
                  'Comprobante con validez fiscal plena ante AFIP y terceros.',
                ],
                [
                  'Solo registro interno',
                  'No',
                  'Serie interna del taller (INV-…)',
                  'Comprobante de gestión para llevar el control interno del taller, sin efecto fiscal ante AFIP.',
                ],
              ]}
            />
            <p className="text-sm text-gray-700 leading-relaxed mt-3 mb-2">
              Las dos series son completamente <strong>independientes</strong>: la numeración interna nunca se mezcla
              con la numeración AFIP, y una factura interna nunca puede tener CAE, número de comprobante AFIP ni estado
              en el ciclo de vida de AFIP. El sistema impide mezclar ambas cosas por error.
            </p>
            <KeyVal items={[
              ['Cuándo usar interna', 'Si no tenés certificado AFIP configurado, si AFIP no responde y necesitás registrar la venta igualmente, o si el servicio prestado no requiere comprobante electrónico.'],
              ['Clonar facturas', 'Las copias de facturas AR se crean por defecto como internas para evitar duplicar comprobantes electrónicos sin revisar. Podés cambiar la modalidad al guardar.'],
              ['Impreso', 'Las facturas internas muestran un banner claro en el PDF: «Este documento es un comprobante interno del taller. No tiene CAE ni validez fiscal ante ARCA/AFIP.»'],
            ]} />
          </>
        ),
      },
      {
        id: 'factura-iva-es',
        title: 'IVA en España',
        emoji: '🇪🇸',
        tags: ['es'],
        body: (
          <>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              JC ONE FIX aplica IVA 21% por defecto. Puedes configurar tipos distintos desde
              Configuración → Margen de IVA.
            </p>
            <KeyVal items={[
              ['Tipo general', '21% — el más habitual para reparaciones electrónicas.'],
              ['Tipo reducido', '10% — si aplica a tu servicio específico.'],
              ['Tipo superreducido', '4% — casos muy concretos.'],
              ['En la factura', 'Se muestra la base imponible + IVA + total. Formato legal español.'],
              ['Factura simplificada', 'Para ventas rápidas en POS sin datos del cliente.'],
            ]} />
          </>
        ),
      },
      {
        id: 'factura-iva-ar',
        title: 'IVA y facturación en Argentina',
        emoji: '🇦🇷',
        tags: ['ar'],
        body: (
          <>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              El tipo de comprobante electrónico lo determina la <strong>condición IVA del taller</strong> (en Configuración
              general) y la del cliente. El panel calcula Factura A, B o C según esas condiciones y los datos del receptor
              (CUIT/DNI).
            </p>
            <Table
              headers={['Condición del taller', 'Comportamiento típico']}
              rows={[
                ['Responsable Inscripto', 'Factura A a RI con CUIT; Factura B a monotributo / CF / exento según corresponda.'],
                ['Monotributista', 'Factura C para los receptores habituales de monotributo.'],
                ['Exento / otras', 'Se adapta el tratamiento de IVA al escenario configurado.'],
              ]}
            />
            <KeyVal items={[
              ['CUIT del taller', 'Configuración → Impuestos y AFIP → campo CUIT / CUIL del taller. Es la única fuente de verdad para todos los comprobantes.'],
              ['Condición IVA del taller', 'Mismo formulario: condición frente al IVA (AFIP/ARCA). Determina si el comprobante será A, B o C.'],
              ['Condición del cliente', 'Ficha del cliente → Condición IVA. Obligatoria para emitir facturas electrónicas A y B desde Mis ventas.'],
              ['Certificados', 'Configuración → Impuestos y AFIP → sección Certificados y entorno ARCA. Subís el .p12 o PEM, el sistema valida el CUIT y la fecha de vencimiento al instante.'],
              ['Cobro en ticket', 'Al confirmar el cobro, si el certificado y el punto de venta están bien, el sistema pide el CAE a AFIP y registra el pago. Si la red falla en el momento, la factura puede quedar «Pendiente» unos minutos hasta que el sistema la reconcilie solo.'],
              ['Factura manual', 'Radio: emitir electrónica AFIP (con CAE) o solo venta interna (sin CAE). Modalidades completamente separadas.'],
              ['Moneda', 'Pesos argentinos (ARS) en todo el flujo del panel.'],
              ['Estado AFIP', 'Cada factura electrónica pasa por: Pendiente → Aprobada por AFIP (con CAE) o Fallida. Ver tema «Estados AFIP» en esta sección.'],
            ]} />
            <Warn>
              La emisión electrónica real depende de ARCA/AFIP y de que tu certificado, CUIT y punto de venta estén correctos en
              el panel. Si el panel acepta el .p12 pero no obtenés CAE al probar conexión o al cobrar, contactá a soporte. Ante
              dudas legales o de categorización, consultá a tu contador.
            </Warn>
          </>
        ),
      },
    ],
  },

  /* ══════════ 6b. FINANZAS (MENÚ SUPERIOR) ══════════ */
  {
    id: 'finanzas-panel',
    icon: Landmark,
    title: 'Finanzas (menú superior)',
    color: '#0369a1',
    content: [
      {
        id: 'finanzas-submenu',
        title: 'Qué incluye el menú «Finanzas»',
        emoji: '🏛️',
        tags: ['ambos'],
        body: (
          <>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              El desplegable <strong>Finanzas</strong> agrupa documentación, ventas, devoluciones y gastos en un orden
              pensado para el día a día:
            </p>
            <Table
              headers={['Orden', 'Ruta', 'Uso']}
              rows={[
                ['1', 'Facturas emitidas (ventas)', 'Listado y gestión de facturas de cobro a clientes.'],
                ['2', 'Facturas recibidas (gastos)', 'Mismo módulo de gastos / compras a proveedores.'],
                ['3', 'Devoluciones al cliente', 'Constancias de devolución o abono (registradas desde la ficha del ticket).'],
                ['4', 'Categorías de gasto', 'Maestro de categorías para clasificar gastos.'],
                ['5', 'Centro de documentación', 'Referencia y enlaces útiles (menos uso operativo diario).'],
              ]}
            />
            <Tip>
              Las facturas de venta y las de gasto quedan <strong>una debajo de la otra</strong> para localizarlas rápido.
              El listado global de devoluciones está en <strong>Finanzas → Devoluciones al cliente</strong>.
            </Tip>
          </>
        ),
      },
      {
        id: 'finanzas-devoluciones-lista',
        title: 'Devoluciones al cliente (listado e impresión)',
        emoji: '📄',
        tags: ['ambos'],
        body: (
          <>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              Desde <strong>Finanzas → Devoluciones al cliente</strong> ves todas las constancias del taller: referencia tipo{' '}
              <strong>DEV-…</strong>, cliente, importe, estado y enlace al ticket correspondiente. El botón de impresión abre
              una vista con el mismo estilo que una factura (cabecera, tabla de concepto y total).
            </p>
            <KeyVal items={[
              [
                'Qué queda registrado',
                'Cada constancia corresponde a una devolución activa en un ticket. Si anulás la devolución desde la ficha del ticket, esa constancia deja de aparecer en el listado.',
              ],
              [
                'Logo en el PDF',
                'Se usa el logo que configuraste en <strong>Configuración del taller</strong> (Ajustes generales). Si no cargaste ninguno, en algunos casos puede mostrarse el logo de la cuenta; conviene subir el del taller para que el impreso sea coherente.',
              ],
            ]} />
            <Warn>
              La constancia es <strong>documento interno</strong>. Para obligaciones fiscales (nota de crédito, factura rectificativa, etc.)
              debes cumplir la normativa de tu país fuera o además de este comprobante.
            </Warn>
          </>
        ),
      },
    ],
  },

  /* ══════════ 7. GASTOS ══════════ */
  {
    id: 'gastos',
    icon: CreditCard,
    title: 'Gastos',
    color: '#dc2626',
    content: [
      {
        id: 'gastos-crear',
        title: 'Registrar un gasto',
        emoji: '🧾',
        tags: ['ambos'],
        body: (
          <>
            <Steps items={[
              'Finanzas → Facturas recibidas (gastos) → Nuevo gasto (o la ruta equivalente de tu menú).',
              'Selecciona la categoría (alquiler, materiales, herramientas, etc.).',
              'Introduce el importe, fecha y descripción.',
              'Opcionalmente, adjunta el comprobante.',
              'Guarda. El gasto aparece en el informe de balance.',
            ]} />
            <Tip>
              Define tus categorías en <strong>Finanzas → Categorías de gasto</strong> para tener informes más precisos.
            </Tip>
          </>
        ),
      },
      {
        id: 'gastos-categorias',
        title: 'Categorías de gasto',
        emoji: '📁',
        tags: ['ambos'],
        body: (
          <>
            <p className="text-sm text-gray-700 leading-relaxed">
              Desde <strong>Finanzas → Categorías de gasto</strong> crea, edita y elimina las categorías
              que mejor describan los gastos de tu taller. Ejemplos habituales:
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {['Alquiler', 'Suministros', 'Herramientas', 'Publicidad', 'Personal', 'Transporte', 'Repuestos', 'Software', 'Seguros'].map((c) => (
                <span key={c} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700 border border-gray-200">{c}</span>
              ))}
            </div>
          </>
        ),
      },
    ],
  },

  /* ══════════ 8. INFORMES ══════════ */
  {
    id: 'informes',
    icon: BarChart3,
    title: 'Informes',
    color: '#0891b2',
    content: [
      {
        id: 'informes-resumen',
        title: 'Resumen general',
        emoji: '📊',
        tags: ['ambos'],
        body: (
          <>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              <strong>Informes → Resumen general</strong> muestra el balance del período seleccionado
              con ingresos, gastos y beneficio neto.
            </p>
            <KeyVal items={[
              ['Ingresos', 'Total de facturas cobradas en el período.'],
              ['Gastos', 'Total de gastos registrados en el período.'],
              ['Beneficio neto', 'Ingresos − Gastos.'],
              ['Filtro de fechas', 'Selecciona hoy, esta semana, este mes o un rango personalizado.'],
              ['Exportar', 'Descarga el informe en Excel con un clic.'],
            ]} />
          </>
        ),
      },
      {
        id: 'informes-tecnicos',
        title: 'Informe de técnicos',
        emoji: '👨‍🔧',
        tags: ['ambos'],
        body: (
          <>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              <strong>Informes → Técnicos</strong> muestra el rendimiento individual de cada técnico:
              tickets completados, tiempo promedio y facturación generada.
            </p>
            <Tip>Usa este informe combinado con el módulo de Comisiones (Configuración → Comisiones) para calcular las comisiones de cada técnico automáticamente.</Tip>
          </>
        ),
      },
    ],
  },

  /* ══════════ 9. CONFIGURACIÓN ══════════ */
  {
    id: 'configuracion',
    icon: Settings,
    title: 'Configuración',
    color: '#64748b',
    content: [
      {
        id: 'config-general',
        title: 'Configuración general del taller',
        emoji: '🏪',
        tags: ['ambos'],
        body: (
          <>
            <KeyVal items={[
              ['Nombre del taller', 'Aparece en facturas, tickets impresos y en la barra superior del panel.'],
              ['Dirección', 'Se imprime en facturas y comprobantes.'],
              ['Teléfono / Email', 'Datos de contacto del taller para los documentos.'],
              ['Moneda', 'EUR para España, ARS para Argentina. Afecta a todos los módulos.'],
              ['Logo del taller', 'Imagen que aparece en facturas y comprobantes impresos.'],
              ['NIF/CIF (ES) / CUIT (AR)', 'Número fiscal. Obligatorio para emitir facturas legales.'],
              [
                'Condición IVA del taller (AR)',
                'En moneda ARS verás el campo de condición frente al IVA (AFIP/ARCA). Debe ser coherente con tu situación real para que el tipo de comprobante A/B/C sea correcto.',
              ],
              ['Zona horaria', 'Spain/Madrid para España, America/Buenos_Aires para Argentina.'],
              ['Experiencia del panel', 'Modo sencillo o completo: menú e inicio. El cambio se aplica al instante al elegir la tarjeta (véase Primeros pasos → Modo sencillo y modo completo).'],
            ]} />
            <Tip>La ruta en el menú es Configuración → Configuración general; el título de la página es «Ajustes generales».</Tip>
          </>
        ),
      },
      {
        id: 'config-arca',
        title: 'Certificados y entorno ARCA — Configuración completa (Argentina)',
        emoji: '📜',
        tags: ['ar'],
        body: (
          <>
            <p className="text-sm text-gray-700 leading-relaxed mb-3">
              En organizaciones con moneda <strong>ARS</strong>, en{' '}
              <Link href="/dashboard/settings?tab=config_impuestos" className="font-medium text-[#0d9488] hover:underline">
                Configuración → Impuestos y AFIP
              </Link>
              {' '}encontrarás la sección <strong>Certificados y entorno ARCA</strong>. Es el punto central de toda la integración
              con AFIP para emitir facturas electrónicas con CAE.
            </p>

            <p className="text-sm font-semibold text-gray-800 mb-1">Paso 1 — Subir el certificado</p>
            <Steps items={[
              'Elige el modo: «.p12 / .pfx» (un solo archivo con contraseña) o «Archivos PEM» (certificado .crt/.pem + clave .key por separado).',
              'Sube el archivo y, en modo .p12, escribe la contraseña del certificado.',
              'Haz clic en «Guardar certificado». El sistema valida el archivo en el momento: si la contraseña es incorrecta o el archivo está dañado, te lo indica de inmediato.',
              'Tras subir con éxito, el panel muestra automáticamente el CUIT detectado en el certificado, la fecha de vencimiento y el nombre del titular (CN). Si el CUIT del certificado no coincide con el CUIT del taller configurado en Ajustes, aparece un aviso naranja de desajuste. Si el certificado ya venció, aparece un aviso rojo.',
            ]} />
            <Warn>
              El CUIT del certificado y el CUIT del taller (Configuración general) deben ser idénticos.
              AFIP rechazará el comprobante si no coinciden.
            </Warn>

            <p className="text-sm font-semibold text-gray-800 mt-4 mb-1">Paso 2 — Punto de venta y entorno</p>
            <Steps items={[
              'Indica el número de punto de venta habilitado en AFIP (el mismo que diste de alta en la web de AFIP/ARCA para facturación electrónica).',
              'Elige el entorno: Homologación (pruebas, sin efecto legal) o Producción (comprobantes válidos ante terceros y el fisco).',
              'Guarda los cambios.',
            ]} />
            <Tip>Empieza siempre en <strong>Homologación</strong> y prueba el flujo completo antes de pasar a Producción.</Tip>

            <p className="text-sm font-semibold text-gray-800 mt-4 mb-1">Paso 3 — Probar la conexión</p>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              El botón <strong>«Probar conexión AFIP»</strong> ejecuta una secuencia de 3–4 pasos con resultado visible en pantalla:
            </p>
            <Table
              headers={['Paso', 'Qué verifica']}
              rows={[
                ['1 — Conexión con AFIP (facturación)', 'Que el servicio de facturación electrónica de AFIP responde.'],
                ['2 — Inicio de sesión con tu certificado', 'Que AFIP acepta tu certificado y CUIT y podés operar.'],
                ['3 — Puntos de venta', 'Lista de puntos de venta habilitados en AFIP para tu CUIT.'],
                ['4 — Último comprobante', 'Si tenés el PV configurado, muestra el último número emitido y confirma que coincide con el guardado en el panel.'],
              ]}
            />
            <p className="text-sm text-gray-700 leading-relaxed mt-2">
              Cada paso muestra ✅ (ok), ❌ (error) o ⬭ (saltado). Si alguno falla, el mensaje es en español claro, sin códigos técnicos.
            </p>

            <p className="text-sm font-semibold text-gray-800 mt-4 mb-1">Paso 4 — Factura de prueba (solo homologación)</p>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              El botón <strong>«Factura de prueba»</strong> emite un comprobante mínimo (Factura C, $1 ARS, consumidor final)
              contra el entorno de homologación de AFIP. Si tiene éxito, devuelve el CAE de prueba. Es la validación definitiva
              de que certificado, CUIT y punto de venta están bien y AFIP autoriza el comprobante de prueba.
            </p>
            <Warn>El botón «Factura de prueba» está desactivado en modo Producción para evitar emitir comprobantes innecesarios.</Warn>

            <p className="text-sm font-semibold text-gray-800 mt-4 mb-1">Validaciones automáticas antes de emitir</p>
            <p className="text-sm text-gray-700 leading-relaxed mb-1">
              El sistema bloquea automáticamente la emisión si detecta alguno de estos problemas, mostrando el mensaje exacto y cómo resolverlo:
            </p>
            <Table
              headers={['Bloqueo', 'Cómo resolverlo']}
              rows={[
                ['No hay certificado guardado', 'Subí el .p12 o los archivos PEM en esta sección.'],
                ['Certificado vencido', 'Renová el certificado en la web de AFIP y subí el nuevo archivo.'],
                ['CUIT desajustado', 'Corregí el CUIT en Configuración general o subí el certificado correcto.'],
                ['Sin punto de venta', 'Ingresá el número de PV habilitado en AFIP (paso 2 de esta sección).'],
              ]}
            />

            <p className="text-sm font-semibold text-gray-800 mt-4 mb-1">Resiliencia automática (transparente al usuario)</p>
            <KeyVal items={[
              ['Timeout', 'Cada llamada a AFIP tiene un límite de 15 segundos. Pasado ese tiempo, el sistema reintenta automáticamente.'],
              ['Reintentos', 'Hasta 3 reintentos automáticos en errores de red (no en errores de AFIP como CUIT inválido).'],
              ['Sesión con AFIP', 'El sistema reutiliza un tiempo la sesión con AFIP para no tener que identificarse de nuevo en cada comprobante.'],
              [
                'Registro para soporte',
                'Cada operación con AFIP queda registrada de forma interna para diagnóstico; el equipo de soporte puede consultarla si hace falta.',
              ],
            ]} />

            <p className="text-sm font-semibold text-gray-800 mt-4 mb-1">Numeración oficial AFIP</p>
            <p className="text-sm text-gray-700 leading-relaxed">
              Antes de emitir cada comprobante, el sistema consulta a AFIP el último número emitido para ese punto de venta y
              tipo de comprobante, calcula el siguiente y lo reserva en el sistema antes de enviar la solicitud.
              Esto garantiza que, incluso si hay un timeout durante el envío, la numeración no se desajusta y la reconciliación
              automática puede recuperar el CAE.
            </p>

            <KeyVal items={[
              [
                'Seguridad del certificado',
                'Los certificados se guardan cifrados. No compartas capturas con contraseñas ni contenido de claves privadas.',
              ],
              [
                'Si el certificado sube bien pero no obtenés CAE',
                'Revisá que la prueba de conexión y la factura de prueba (en homologación) hayan dado bien. Si el mensaje del panel no alcanza, contactá a soporte JC ONE FIX.',
              ],
            ]} />
          </>
        ),
      },
      {
        id: 'config-arca-troubleshoot',
        title: 'AFIP — Resolución de errores comunes (Argentina)',
        emoji: '🔧',
        tags: ['ar'],
        body: (
          <>
            <p className="text-sm text-gray-700 leading-relaxed mb-3">
              El sistema traduce todos los errores técnicos de AFIP/ARCA a mensajes en español. Esta tabla ayuda a entender
              las causas raíz y cómo resolverlas:
            </p>
            <Table
              headers={['Mensaje en el panel', 'Causa', 'Solución']}
              rows={[
                [
                  'Tu certificado está vencido',
                  'La fecha de vencimiento del .p12 pasó.',
                  'Solicitá un nuevo certificado en la web de AFIP y subílo.',
                ],
                [
                  'El CUIT del taller no coincide con el certificado',
                  'Distinto CUIT entre Ajustes y el .p12.',
                  'Corregí el CUIT en Configuración general o subí el certificado correspondiente a ese CUIT.',
                ],
                [
                  'Punto de venta no habilitado en AFIP',
                  'El número de PV guardado no existe en AFIP para tu CUIT.',
                  'Ingresá al sitio de AFIP/ARCA y dalo de alta, o corregí el número en el paso 2.',
                ],
                [
                  'No hubo comunicación con ARCA/AFIP',
                  'Error de red o servidores de AFIP caídos momentáneamente.',
                  'Esperá unos minutos y volvé a intentar. AFIP suele recuperarse en minutos.',
                ],
                [
                  'El comprobante está duplicado',
                  'AFIP ya tiene ese número de comprobante registrado para este PV.',
                  'Revisá las facturas del ticket. No repitas la acción de cobro; la factura ya existe en AFIP.',
                ],
                [
                  'Esta factura ya está en proceso de autorización',
                  'La factura está en estado «pendiente» (envío en curso o timeout).',
                  'Esperá unos minutos: la reconciliación automática (cada 5 min) intentará recuperar el CAE.',
                ],
              ]}
            />
            <Tip>
              Si tras 30 minutos una factura sigue en estado «Pendiente», contactá a soporte JC ONE FIX: pueden revisar el
              historial técnico del envío y decirte el siguiente paso.
            </Tip>
          </>
        ),
      },
      {
        id: 'config-empleados',
        title: 'Empleados y roles',
        emoji: '👷',
        tags: ['ambos'],
        body: (
          <>
            <p className="text-sm text-gray-700 mb-2">Gestiona el equipo desde Configuración → Equipo y accesos.</p>
            <Table
              headers={['Rol', 'Permisos típicos']}
              rows={[
                ['Propietario (owner)', 'Acceso total. No puede ser limitado.'],
                ['Administrador', 'Casi todo, excepto gestión de facturación de la cuenta.'],
                ['Gerente', 'Tickets, clientes, inventario, informes. Sin ajustes críticos.'],
                ['Recepcionista', 'Crear tickets y clientes, cobrar, gestionar entregas.'],
                ['Técnico 1/2/3', 'Ver y actualizar sus tickets asignados.'],
              ]}
            />
            <KeyVal items={[
              ['Enlace de usuario del panel', 'En Equipo y accesos puedes enlazar a cada empleado con su cuenta de usuario para que reciba notificaciones en la campana al ser asignado a un ticket.'],
              ['Permisos personalizados', 'Configuración → Permisos de roles: activa o desactiva permisos específicos por rol.'],
              ['Reloj de fichaje y PIN', 'Cada ficha puede tener PIN de acceso para el reloj. Si aún no hay empleados, al abrir el reloj se crea un registro para tu usuario; lo verás y editarás aquí como cualquier otro empleado.'],
            ]} />
          </>
        ),
      },
      {
        id: 'config-qz',
        title: 'Bandeja QZ (Impresión y cajón)',
        emoji: '🖨️',
        tags: ['ambos'],
        body: (
          <>
            <p className="text-sm text-gray-700 mb-2">
              <strong>QZ Tray</strong> es una aplicación gratuita que se instala en el PC del taller y permite imprimir
              directamente en impresoras térmicas y abrir el cajón portamonedas desde el navegador.
            </p>
            <Steps items={[
              'Descarga QZ Tray desde qz.io/download/ e instálalo en el PC del taller.',
              'Abre QZ Tray (queda corriendo en el fondo).',
              'En el panel: Configuración → Bandeja QZ.',
              'Haz clic en "Comprobar conexión". Si QZ está activo, aparecerá en verde con la versión.',
              'Puerto por defecto: 8182. Si usas HTTPS, activa "Conexión segura (WSS)" y sube el certificado de QZ.',
              'Guarda la configuración.',
            ]} />
            <Warn>QZ Tray solo funciona en el PC donde está instalado. Si abres el panel desde otro equipo o desde el móvil, la impresión automática y el cajón no estarán disponibles.</Warn>
          </>
        ),
      },
      {
        id: 'config-notificaciones',
        title: 'Notificaciones (campana)',
        emoji: '🔔',
        tags: ['ambos'],
        body: (
          <>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              El icono de campana en la barra superior muestra notificaciones internas:
            </p>
            <KeyVal items={[
              ['Ticket asignado', 'Recibes una notificación cuando un ticket se te asigna a ti.'],
              ['Seguimiento por retraso', 'Si un ticket lleva mucho tiempo en espera (piezas, presupuesto, cliente…), puedes recibir un aviso «Seguimiento» para revisar el caso. Depende del motivo de espera, la configuración en Ajustes y la posposición (snooze).'],
              ['Ticket listo', 'Recepción recibe aviso cuando un técnico marca el ticket como "Reparado".'],
              ['Soporte JC', 'Mensajes del equipo de soporte de JC ONE FIX.'],
              [
                'Aviso visual y sonido',
                'Si hay avisos sin leer, la campana hace un pequeño balanceo cada 5 segundos para que quien estuvo ausente vea que hay algo pendiente. La primera vez que entra un aviso nuevo puede sonar un pitido (según el navegador y si ya hubo un clic en el panel). Al volver a la pestaña del panel, el sistema intenta desplazar la vista hasta la campana.',
              ],
              [
                'Silenciar pitidos',
                'Abre la campana: en el pie del panel verás «Pitido al avisar» con Activado / Silenciado. Ahí se guarda la preferencia en tu navegador.',
              ],
            ]} />
            <Tip>Para recibir notificaciones de asignación debes tener tu cuenta de usuario enlazada a tu ficha de empleado. Pídele al propietario de la cuenta que lo configure en Configuración → Equipo y accesos.</Tip>
            <p className="text-sm text-gray-600 mt-2">
              Si en tu sistema activaste <strong>reducir movimiento</strong> (accesibilidad del navegador o del SO), el balanceo de la campana se omite automáticamente.
            </p>
          </>
        ),
      },
      {
        id: 'config-whatsapp',
        title: 'WhatsApp y Email',
        emoji: '💬',
        tags: ['ambos'],
        body: (
          <>
            <p className="text-sm text-gray-700 mb-2">
              Configura la integración desde <strong>Configuración → Correo y WhatsApp</strong>.
            </p>
            <KeyVal items={[
              ['WhatsApp rápido', 'Botón en la ficha del cliente y del ticket. Abre WhatsApp Web/App con un mensaje pre-rellenado.'],
              [
                'Pulir con IA en el mensaje',
                'En el cuadro de envío rápido a WhatsApp puedes pulsar «Pulir con IA» para mejorar ortografía y tono del borrador antes de abrir WhatsApp; «Deshacer» recupera el texto anterior.',
              ],
              ['Email de notificación', 'Configura el servidor SMTP para enviar emails desde tu propio dominio.'],
              ['Plantillas de email', 'Configuración → Editor de plantillas. Personaliza el mensaje que recibe el cliente al cambiar el estado de su reparación.'],
              ['Número de soporte AR', 'En Argentina, el contacto de soporte que ves en el panel es el definido para tu instalación.'],
            ]} />
          </>
        ),
      },
    ],
  },

  /* ══════════ 10. HERRAMIENTAS ══════════ */
  {
    id: 'herramientas',
    icon: Zap,
    title: 'Herramientas y accesos rápidos',
    color: '#d97706',
    content: [
      {
        id: 'soporte-incidencias',
        title: 'Problemas técnicos o errores raros',
        emoji: '🛟',
        tags: ['ambos'],
        body: (
          <>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              Esta guía explica cómo usar el panel en el día a día. Si ves un mensaje de error que no entendés, una pantalla en
              blanco o algo que antes funcionaba y dejó de hacerlo, no hace falta que sepas nada de programación ni de bases de
              datos.
            </p>
            <Steps items={[
              'Anotá el texto exacto del error o hacé una captura de pantalla.',
              'Probá recargar la página y, si podés, cerrar sesión y volver a entrar.',
              'Contactá a soporte JC ONE FIX indicando el nombre del taller, qué estabas haciendo (por ejemplo «cobrar ticket 123») y la captura o el mensaje.',
            ]} />
            <Tip>
              Cuanto más concreto sea el paso que falló, más rápido podremos ayudarte.
            </Tip>
          </>
        ),
      },
      {
        id: 'herr-afip-checklist',
        title: 'Checklist AFIP: primer usuario paso a paso (Argentina)',
        emoji: '✅',
        tags: ['ar'],
        body: (
          <>
            <p className="text-sm text-gray-700 leading-relaxed mb-3">
              Esta lista es <strong>solo lo que hacés desde el panel</strong> para dejar lista la facturación electrónica. La
              instalación del servicio ya debe estar correcta (eso lo resuelve JC ONE FIX o quien te dio de alta). Seguí el orden.
            </p>
            <Steps items={[
              'Configuración → Impuestos y AFIP: ingresar CUIT del taller (11 dígitos sin guiones) y guardar.',
              'En el mismo formulario: indicar la condición IVA del taller (Monotributo / Responsable Inscripto / etc.) y guardar.',
              'En la sección «Certificados y entorno ARCA»: subir el certificado .p12 con la contraseña. Verificar que el panel muestra el CUIT detectado (debe coincidir con el del paso 1) y la fecha de vencimiento.',
              'Indicar el punto de venta (el mismo dado de alta en la web de AFIP). Guardar.',
              'Dejar el entorno en Homologación. Pulsar «Probar conexión AFIP» y esperar el resultado paso a paso.',
              'Si los 4 pasos del test muestran ✅: pulsar «Factura de prueba» y verificar que devuelve un CAE de homologación.',
              'Con el flujo validado: cambiar el entorno a Producción, guardar y volver a pulsar «Probar conexión» para confirmar.',
              'Crear un ticket de prueba con datos reales del taller, cobrar → el sistema emitirá el primer CAE real.',
            ]} />
            <Warn>
              Nunca actives Producción sin haber validado primero el flujo completo en Homologación.
              Un comprobante emitido en producción tiene validez legal y ocupa un número de la secuencia oficial.
            </Warn>
            <Tip>
              Si en algún paso ves un error en rojo, el mensaje te dice exactamente qué corregir. Los errores de red
              se reintentan automáticamente; los errores de datos (CUIT, PV, certificado) requieren corrección manual.
            </Tip>
          </>
        ),
      },
      {
        id: 'herr-busqueda',
        title: 'Búsqueda global',
        emoji: '🔍',
        tags: ['ambos'],
        body: (
          <>
            <p className="text-sm text-gray-700 leading-relaxed">
              El campo de búsqueda en la barra superior busca simultáneamente en tickets
              (número, marca, modelo) y clientes (nombre, teléfono, email). Resultados en tiempo real
              con un mínimo de 2 caracteres y una pequeña pausa entre tecla y tecla para no saturar el sistema.
            </p>
            <Tip>Escribe el número de ticket completo (ej. &quot;T-00123&quot;) para ir directamente a la ficha.</Tip>
          </>
        ),
      },
      {
        id: 'herr-ia',
        title: 'Mejorar y pulir textos con IA (Groq)',
        emoji: '✨',
        tags: ['ambos'],
        body: (
          <>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              Los botones de <strong>mejora de redacción</strong> en el panel usan el motor <strong>Groq</strong> en los servidores
              de JC ONE FIX: no hace falta que cada taller pegue una clave en Configuración para usarlos. Sirven para dejar el
              texto listo para el cliente o la orden sin inventar fallos ni repuestos que no hayas escrito tú.
            </p>
            <KeyVal items={[
              [
                'Mejorar con IA (diagnóstico)',
                'En la ficha del ticket, bloque «Diagnóstico / Comentarios de reparación»: redacta notas breves y pulsa el botón para obtener un párrafo ordenado; «Deshacer» vuelve al texto anterior.',
              ],
              [
                'Pulir con IA (comentarios)',
                'En el área de comentarios del ticket (interno o al cliente) hay un botón equivalente para pulir lo que escribiste antes de publicar.',
              ],
              [
                'Pulir con IA (WhatsApp rápido)',
                'Al abrir el envío rápido de WhatsApp desde el ticket, puedes pulir el mensaje antes de que se abra WhatsApp Web o la app.',
              ],
              [
                'Presupuesto para WhatsApp (Gemini)',
                'Si tu instalación incluye la generación automática del texto de presupuesto para WhatsApp, ese flujo puede usar Google Gemini en la infraestructura del servicio (independiente de Groq).',
              ],
            ]} />
            <Tip>
              Si muchas personas pulsan a la vez, puede aparecer un aviso de límite de uso: espera un minuto y vuelve a
              intentar. Eso no indica un fallo del taller.
            </Tip>
          </>
        ),
      },
      {
        id: 'herr-portal',
        title: 'Portal del cliente',
        emoji: '🌐',
        tags: ['ambos'],
        body: (
          <>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              El portal público permite a los clientes consultar el estado de su reparación
              sin necesidad de llamar al taller.
            </p>
            <Steps items={[
              'Activa el portal en Configuración → Portal cliente.',
              'Comparte el enlace del ticket con el cliente (botón "Compartir" en la ficha del ticket o envío por WhatsApp/email).',
              'El cliente accede y ve el estado actual, el diagnóstico (si lo has marcado como visible) y las fotos post-reparación.',
            ]} />
          </>
        ),
      },
      {
        id: 'herr-clock',
        title: 'Reloj de entrada / salida (fichaje)',
        emoji: '🕐',
        tags: ['ambos'],
        body: (
          <>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              Ruta: menú de usuario (icono de perfil) → <strong>Reloj de entrada / salida</strong>.
              La jornada se registra por <strong>empleado</strong> seleccionado en el desplegable. Los técnicos
              activos salen de <strong>Configuración → Equipo y accesos</strong>; si todavía no hay ninguno,
              al entrar en el reloj se crea automáticamente un empleado con tu nombre de cuenta (o email) para que
              el administrador pueda fichar sin paso previo. Cada persona puede tener <strong>PIN de fichaje</strong>{' '}
              opcional en su ficha de empleado.
            </p>
            <KeyVal items={[
              ['Barra superior', 'Muestra el nombre del taller y la fecha en español.'],
              ['Reloj', 'Hora en tiempo real y fecha completa.'],
              [
                'Empleado',
                'Lista de técnicos activos. Con cero empleados, al cargar esta pantalla se crea uno vinculado a tu usuario (nombre de perfil o parte del email) y aparece aquí para seleccionarlo y fichar.',
              ],
              ['PIN de acceso', 'Si en el empleado configuraste PIN de fichaje, introdúcelo aquí. Si lo dejaste vacío en ajustes, no hace falta.'],
              ['Estado', 'Indica si está fuera de jornada, en jornada o en descanso según el último fichaje del día.'],
              ['Añadir nota', 'Opcional: se guarda junto al <em>siguiente</em> fichaje que pulses.'],
              ['Entradas / Salidas', 'Registran inicio y fin de la jornada ese día.'],
              ['Iniciar / Finalizar descanso', 'Marca pausas (comida, etc.) sin cerrar la jornada.'],
              ['Registrar entrada / salida', 'Botones grandes debajo del panel: misma lógica que Entradas/Salidas.'],
              ['Registros de hoy', 'Listado del día para el empleado seleccionado (hora, tipo e icono).'],
              ['Ver planilla de control de horas', 'Tabla de los últimos 30 días para ese empleado (exportable a revisión interna).'],
            ]} />
            <p className="text-sm text-gray-700 leading-relaxed mt-3 mb-1">
              <strong>Comienzo de turno</strong> (mismo menú de usuario) es otra pantalla, pensada para turnos ligados a
              tickets de reparación. El <strong>reloj de fichaje</strong> es el que registra la jornada laboral del día
              (entradas, salidas y descansos); el PIN, si lo hay, se comprueba de forma segura al registrar cada marca.
            </p>
            <Tip>
              Si al fichar ves un error que no entiendes, revisa empleado seleccionado y PIN; si continúa, contacta con
              soporte JC ONE FIX desde el widget de ayuda del panel.
            </Tip>
            <Tip>
              Configura el PIN en <strong>Configuración → Equipo y accesos</strong> → editar empleado → campo «PIN de acceso del empleado (fichaje)».
            </Tip>
            <Tip>
              El empleado creado automáticamente para tu cuenta es una fila normal en{' '}
              <strong>Configuración → Equipo y accesos</strong>: renómbralo, añade PIN o desactívalo cuando incorpores
              al equipo (puedes tener varios empleados y elegir en el desplegable quién ficha).
            </Tip>
          </>
        ),
      },
      {
        id: 'herr-chat',
        title: 'Chat interno',
        emoji: '💬',
        tags: ['ambos'],
        body: (
          <>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              El chat flotante (icono burbuja en la esquina inferior derecha del panel)
              es un canal de comunicación interno entre los miembros del equipo. No es visible para los clientes.
              También existe la página <strong>Comunicación / Canal general</strong> en el menú lateral para el mismo hilo con más espacio.
            </p>
            <KeyVal items={[
              [
                'Nombre que se ve en cada mensaje',
                'El panel muestra el nombre de <strong>Mi perfil → Información personal</strong> (nombre y apellidos guardados en tu cuenta), no la parte del correo. Si cambias el perfil y guardas, el chat actualiza el nombre.',
              ],
              [
                'Menciones @',
                'Para avisar a alguien escribe @ seguido del <strong>primer nombre en minúsculas</strong> (sin espacios), tal como indica la pista bajo el cuadro de texto. Si la persona no tiene nombre en el perfil, se usa la parte del email antes de @. El mensaje resalta cuando te mencionan a ti.',
              ],
              [
                'Adjuntos',
                'Desde el chat flotante puedes adjuntar imágenes o PDF según los límites del sistema.',
              ],
            ]} />
            <Tip>
              Pide a cada empleado que complete <strong>Mi perfil</strong> con nombre y apellidos: así el equipo se reconoce de inmediato en el historial del chat.
            </Tip>
          </>
        ),
      },
      {
        id: 'herr-soporte',
        title: 'Soporte técnico de JC ONE FIX',
        emoji: '🛟',
        tags: ['ambos'],
        body: (
          <>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">
              Tienes acceso directo al equipo de soporte de <strong>JC ONE FIX</strong> desde dentro del panel,
              sin necesidad de salir ni abrir otra aplicación.
            </p>
            <KeyVal items={[
              ['Cómo acceder', 'Haz clic en el icono del asistente (cara animada) en la barra superior del panel, a la derecha de la campana.'],
              ['Qué es', 'Un chat en tiempo real con el equipo técnico de JC ONE FIX. No es un bot: es una persona real respondiendo.'],
              ['Punto verde', 'Cuando el icono tiene un punto verde brillante, el equipo de soporte está activo y disponible.'],
              ['Mensajes no leídos', 'Si el soporte te envía un mensaje mientras el chat está cerrado, aparece un contador rojo sobre el icono.'],
              ['Qué puedes consultar', 'Dudas sobre el funcionamiento, configuraciones, errores, personalizaciones, peticiones de nuevas funciones, etc.'],
            ]} />
            <Tip>Si ves el punto verde en el icono del asistente, es el mejor momento para preguntar: recibirás respuesta casi inmediata.</Tip>
            <div className="mt-3 rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
              <p className="text-xs font-semibold text-gray-700 mb-1.5">¿Cuándo usar el soporte?</p>
              <ul className="space-y-1.5">
                {[
                  'No encuentras una función o no sabes cómo usarla.',
                  'Algo no funciona como esperabas y no encuentras la causa.',
                  'Quieres configurar algo específico para tu tipo de taller.',
                  'Tienes una sugerencia o petición de mejora.',
                  'Necesitas ayuda con la configuración inicial del sistema.',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs text-gray-600">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#0d9488] mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        ),
      },
    ],
  },
];

/* ─────────────────────────────────────────────
   COMPONENTE PRINCIPAL
───────────────────────────────────────────── */

function UserGuidePageInner() {
  const guideSections = GUIDE_SECTIONS;

  const [activeSectionId, setActiveSectionId] = useState('inicio');
  const [activeTopicId, setActiveTopicId] = useState('bienvenida');
  const [openTopics, setOpenTopics] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  /** Solo contenido Argentina / universal; temas marcados solo «España» no se listan. */
  const regionFilter: 'ar' = 'ar';
  const contentRef = useRef<HTMLDivElement>(null);

  const activeSection = guideSections.find((s) => s.id === activeSectionId) ?? guideSections[0];

  // Al cambiar sección, seleccionar el primer tema
  useEffect(() => {
    const first = activeSection.content[0];
    if (first) setActiveTopicId(first.id);
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeSectionId]);

  const filteredSections: Section[] = guideSections.map((sec) => ({
    ...sec,
    content: sec.content.filter((t) => {
      const matchRegion =
        !t.tags || t.tags.includes(regionFilter) || t.tags.includes('ambos');
      const q = search.toLowerCase();
      const fig = figureForTopic(t);
      const matchSearch =
        !q ||
        t.title.toLowerCase().includes(q) ||
        (typeof t.body === 'string' && t.body.toLowerCase().includes(q)) ||
        (fig &&
          (fig.alt.toLowerCase().includes(q) || fig.caption.toLowerCase().includes(q)));
      return matchRegion && matchSearch;
    }),
  })).filter((s) => s.content.length > 0);

  const activeTopic = activeSection.content.find((t) => t.id === activeTopicId) ?? activeSection.content[0];
  const activeTopicFigure = activeTopic ? figureForTopic(activeTopic) : undefined;

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      {/* ── Cabecera ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex-shrink-0">
        <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
          <Link href="/dashboard" className="hover:text-gray-700">Inicio</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-gray-900 font-medium">Guía de usuario</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0d9488]">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex flex-wrap items-center gap-2">
                Guía de usuario
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900">
                  Argentina
                </span>
              </h1>
              <p className="text-xs text-gray-500">
                Cada tema incluye una ilustración de referencia del panel para ubicarte rápido en la interfaz.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:ml-auto flex-wrap">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar en la guía…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 rounded-lg border border-gray-200 bg-white pl-8 pr-3 text-sm focus:border-[#0d9488] focus:outline-none focus:ring-1 focus:ring-[#0d9488]/30 w-48"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Cuerpo: sidebar + contenido ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar de secciones ── */}
        <aside className="hidden md:flex w-56 flex-col flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
          <nav className="py-2">
            {filteredSections.map((sec) => {
              const Icon = sec.icon;
              const active = sec.id === activeSectionId;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSectionId(sec.id)}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors',
                    active
                      ? 'bg-[#0d9488]/8 text-[#0d9488] font-semibold border-l-2 border-[#0d9488]'
                      : 'text-gray-600 hover:bg-gray-50'
                  )}
                >
                  <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-[#0d9488]' : 'text-gray-400')} />
                  <span className="truncate">{sec.title}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ── Selector de temas (mobile/tablet) ── */}
        <div className="md:hidden border-b border-gray-200 bg-white px-4 py-2 flex-shrink-0 overflow-x-auto">
          <div className="flex gap-2">
            {filteredSections.map((sec) => {
              const Icon = sec.icon;
              const active = sec.id === activeSectionId;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSectionId(sec.id)}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap',
                    active ? 'bg-[#0d9488] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {sec.title}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Lista de temas + contenido ── */}
        <div className="flex flex-1 overflow-hidden">
          {/* Lista de temas de la sección activa */}
          <div className="hidden lg:flex w-52 flex-col flex-shrink-0 border-r border-gray-100 bg-gray-50 overflow-y-auto">
            <p className="px-4 pt-4 pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              {activeSection.title}
            </p>
            <nav className="pb-4">
              {activeSection.content.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTopicId(t.id)}
                  className={cn(
                    'flex w-full items-start gap-2 px-4 py-2 text-left text-xs transition-colors',
                    t.id === activeTopicId
                      ? 'bg-white text-[#0d9488] font-semibold shadow-sm rounded-lg mx-1 w-[calc(100%-8px)] px-3'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  <span className="shrink-0 mt-0.5">{t.emoji}</span>
                  <span className="leading-snug">{t.title}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Contenido del tema */}
          <div ref={contentRef} className="flex-1 overflow-y-auto">
            {activeTopic ? (
              <div className="max-w-3xl mx-auto px-6 py-6">
                {/* Tags de región */}
                {activeTopic.tags && activeTopic.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {activeTopic.tags.map((tag) => {
                      const info = TAG_LABEL[tag];
                      if (!info) return null;
                      return (
                        <span key={tag} className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold', info.color)}>
                          {info.label}
                        </span>
                      );
                    })}
                  </div>
                )}
                <h2 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                  {activeTopic.emoji && <span>{activeTopic.emoji}</span>}
                  {activeTopic.title}
                </h2>
                {activeTopicFigure ? <GuideFigureBlock figure={activeTopicFigure} /> : null}
                <div className="mt-4">{activeTopic.body}</div>

                {/* Navegación entre temas */}
                <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
                  {(() => {
                    const topics = activeSection.content;
                    const idx = topics.findIndex((t) => t.id === activeTopic.id);
                    const prev = idx > 0 ? topics[idx - 1] : null;
                    const next = idx < topics.length - 1 ? topics[idx + 1] : null;
                    return (
                      <>
                        {prev ? (
                          <button
                            onClick={() => setActiveTopicId(prev.id)}
                            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0d9488] transition-colors"
                          >
                            <ChevronRight className="h-4 w-4 rotate-180" />
                            <span>{prev.emoji} {prev.title}</span>
                          </button>
                        ) : <div />}
                        {next ? (
                          <button
                            onClick={() => setActiveTopicId(next.id)}
                            className="flex items-center gap-1.5 text-sm text-[#0d9488] font-medium hover:text-[#0f766e] transition-colors"
                          >
                            <span>{next.emoji} {next.title}</span>
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        ) : (
                          // Última sección — sugerir siguiente sección
                          (() => {
                            const secIdx = guideSections.findIndex((s) => s.id === activeSectionId);
                            const nextSec = guideSections[secIdx + 1];
                            return nextSec ? (
                              <button
                                onClick={() => setActiveSectionId(nextSec.id)}
                                className="flex items-center gap-1.5 text-sm text-[#0d9488] font-medium hover:text-[#0f766e] transition-colors"
                              >
                                <span>Siguiente sección: {nextSec.title}</span>
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            ) : null;
                          })()
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Selecciona un tema para leer la guía</p>
                </div>
              </div>
            )}
          </div>

          {/* En móvil: acordeón de temas */}
          <div className="lg:hidden fixed inset-0 z-40 pointer-events-none" />
        </div>
      </div>

      {/* ── Temas en acordeón para tablet (< lg) ── */}
      <div className="lg:hidden border-t border-gray-100 bg-white px-4 py-2 flex-shrink-0 overflow-x-auto">
        <div className="flex gap-2">
          {activeSection.content.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTopicId(t.id)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap border',
                t.id === activeTopicId
                  ? 'bg-[#0d9488] text-white border-[#0d9488]'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              )}
            >
              {t.emoji} {t.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function UserGuidePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[50vh] items-center justify-center text-sm text-muted-foreground">
          Cargando guía…
        </div>
      }
    >
      <UserGuidePageInner />
    </Suspense>
  );
}

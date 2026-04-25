import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PartnersMarquee } from '@/components/landing/partners-marquee';
import { MarketingFooter } from '@/components/landing/marketing-footer';
import { PricingWithLead } from '@/components/landing/PricingWithLead';
import { ModulosFichasShowcase } from '@/components/landing/modulos-fichas-showcase';
import { FeaturesSection } from '@/components/landing/features-section';
import { LandingSiteHeader } from '@/components/landing/LandingSiteHeader';
import { QueIncluyeSection } from '@/components/landing/que-incluye-section';
import { ImportDemoInteractive } from '@/components/landing/import-demo-interactive';
import { LiveActivityCarousel } from '@/components/landing/LiveActivityCarousel';
import { HeroTicketStatusOrbit } from '@/components/landing/hero-ticket-status-orbit';
import { JcOneFixMark, JcOneFixAppIcon } from '@/components/jc-one-fix-mark';
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Calendar,
  CreditCard,
  Clock,
  Cpu,
  MessageSquare,
  Package,
  Settings,
  ShoppingCart,
  Sparkles,
  Ticket,
  Users,
  Wrench,
  Zap,
} from 'lucide-react';
import { JC_PLAN_AR } from '@/lib/plan-marketing';
import { formatPrecioListadoArs } from '@/lib/pricing-config';
import { getArgentinaAlternates, getSiteCanonicalUrl } from '@/lib/site-canonical';

const APP_URL = getSiteCanonicalUrl();

const HOME_TITLE = 'Jconefix | El Mejor Software de Gestión para Servicio Técnico';

const HOME_DESCRIPTION =
  'Gestioná tus reparaciones, clientes y stock de forma profesional y eficiente. La herramienta líder para técnicos en Argentina.';

export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  alternates: getArgentinaAlternates(`${APP_URL}/`),
  keywords: [
    'software gestion taller argentina',
    'factura electronica arca taller',
    'sistema para service tecnico',
    'gestion de reparaciones cloud',
    'órdenes de reparación',
    'facturación electrónica ARCA',
    'AFIP',
    'control de stock',
    'notificaciones por WhatsApp',
    'software taller Argentina',
    'gestión servicio técnico',
    'Jconefix',
    'JC ONE FIX',
    'importar excel taller',
    'importar datos taller',
    'migrar desde SAT Network',
    'exportar SAT Network a Excel',
    'Líder Gestión Excel',
    'migrar taller Excel Argentina',
  ],
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: `${APP_URL}/`,
    siteName: 'JC ONE FIX',
    locale: 'es_AR',
    type: 'website',
    images: [
      {
        url: `${APP_URL}/og-image1.png`,
        width: 1200,
        height: 630,
        alt: 'Jconefix — Software de Gestión para Servicios Técnicos',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [
      {
        url: `${APP_URL}/og-image1.png`,
        width: 1200,
        height: 630,
        alt: 'Jconefix — software de taller rápido, AFIP y WhatsApp',
      },
    ],
  },
};

/** URLs verificadas contra el CDN de Unsplash (IDs antiguos devolvían 404). */
const unsplash = (id: string, w: number, h?: number) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}${h ? `&h=${h}` : ''}&q=82`;

/** Fichas alineadas con el producto real (sidebar + rutas /dashboard/*). Cada una tiene ancla #detalle-<id> para CTAs. */
const modulosOferta: {
  id: string;
  title: string;
  tagline: string;
  icon: typeof Wrench;
  /** Imagen grande en fichas largas (#modulos-detalle). */
  image: string;
  /** Miniatura liviana para la rejilla #que-incluye (taller electrónico / microreparación). */
  imageCard: string;
  bullets: string[];
}[] = [
  {
    id: 'reparaciones',
    title: 'Órdenes y Equipos',
    tagline:
      'Ingreso rápido por IMEI, estados personalizados y firma digital del cliente en pantalla.',
    icon: Wrench,
    image: unsplash('1576613109753-27804de2cba8', 1400, 875),
    imageCard: unsplash('1576613109753-27804de2cba8', 800, 500),
    bullets: [
      'Cada ticket lleva foto del estado inicial, presupuesto firmado y seguimiento en tiempo real.',
      'Imprimí etiquetas térmicas o mandá el comprobante directo por WhatsApp.',
    ],
  },
  {
    id: 'clientes',
    title: 'Base de Datos de Clientes',
    tagline:
      'Toda la información de tus clientes organizada y a mano.',
    icon: Users,
    image: unsplash('1556761175-b413da4baf72', 1400, 875),
    imageCard: unsplash('1556761175-b413da4baf72', 800, 500),
    bullets: [
      'Historial completo de reparaciones, deudas pendientes y notas de confianza.',
      'Filtros avanzados para saber quiénes son tus clientes más fieles.',
    ],
  },
  {
    id: 'inventario',
    title: 'Stock y Repuestos',
    tagline:
      'Control total de lo que tenés en el taller para que nunca falte nada.',
    icon: Package,
    image: unsplash('1586528116311-ad8dd3c8310d', 1400, 875),
    imageCard: unsplash('1586528116311-ad8dd3c8310d', 800, 500),
    bullets: [
      'Alertas automáticas de stock bajo en pines de carga, módulos y baterías.',
      'Ubicación por estante o cajón para encontrar todo en segundos.',
    ],
  },
  {
    id: 'pos',
    title: 'Ventas y Caja Diaria',
    tagline:
      'Tu mostrador bajo control, sin errores al cerrar el día.',
    icon: ShoppingCart,
    image: unsplash('1556742049-0cfed4f6a45d', 1400, 875),
    imageCard: unsplash('1556742049-0cfed4f6a45d', 800, 500),
    bullets: [
      'Cobros rápidos de accesorios y mano de obra con arqueo automático.',
      'Historial de ingresos por efectivo, transferencia o tarjeta.',
    ],
  },
  {
    id: 'comunicacion',
    title: 'Comunicación y Chat',
    tagline:
      'Mantené a tu equipo y a tus clientes conectados.',
    icon: MessageSquare,
    image: unsplash('1523240795612-9a054b0db644', 1400, 875),
    imageCard: unsplash('1523240795612-9a054b0db644', 800, 500),
    bullets: [
      'Chat interno para técnicos y portal online para que el cliente vea su estado sin llamar.',
      'Notificaciones automáticas para que el cliente sepa que su equipo está listo.',
    ],
  },
  {
    id: 'informes',
    title: 'Informes y Analítica',
    tagline:
      'Tomá decisiones con datos reales sobre tu negocio.',
    icon: BarChart3,
    image: unsplash('1454165804606-c3d57bc86b40', 1400, 875),
    imageCard: unsplash('1454165804606-c3d57bc86b40', 800, 500),
    bullets: [
      'Gráficos de productividad: Mirá qué técnico o rubro te deja más ganancia.',
      'Seguimiento de ingresos y gastos mensuales para cuidar tu rentabilidad.',
    ],
  },
  {
    id: 'gastos',
    title: 'Gastos y Finanzas',
    tagline:
      'No pierdas de vista a dónde se va tu dinero.',
    icon: CreditCard,
    image: unsplash('1554224155-6726b3ff858f', 1400, 875),
    imageCard: unsplash('1554224155-6726b3ff858f', 800, 500),
    bullets: [
      'Carga de facturas de proveedores para descontar del stock automáticamente.',
      'Control de gastos fijos para calcular tu ganancia neta real.',
    ],
  },
  {
    id: 'operacion',
    title: 'Operación del Equipo',
    tagline:
      'Gestioná los tiempos de tu taller como un profesional.',
    icon: Clock,
    image: unsplash('1580894908361-967195033215', 1400, 875),
    imageCard: unsplash('1580894908361-967195033215', 800, 500),
    bullets: [
      'Control de entrada/salida de empleados y asignación de tareas específicas.',
      'Agenda de turnos para que el mostrador nunca se sature.',
    ],
  },
  {
    id: 'configuracion',
    title: 'Configuración y AFIP',
    tagline:
      'Cumplí con las normativas legales sin complicaciones.',
    icon: Settings,
    image: unsplash('1517694712202-14dd9538aa97', 1400, 875),
    imageCard: unsplash('1517694712202-14dd9538aa97', 800, 500),
    bullets: [
      'Integración directa con AFIP / ARCA para emitir facturas legales con QR.',
      'Configurá tus puntos de venta y plantillas de impresión en un minuto.',
    ],
  },
  {
    id: 'ia',
    title: 'Asistente IA Gemini',
    tagline:
      'La tecnología de Google trabajando para tu taller.',
    icon: BrainCircuit,
    image: unsplash('1620712943543-bcc4688e7485', 1400, 875),
    imageCard: unsplash('1620712943543-bcc4688e7485', 800, 500),
    bullets: [
      'Gemini redacta fallas técnicas profesionales y presupuestos en segundos.',
      'Mensajes listos para WhatsApp que ahorran 15 minutos de escritura por equipo.',
    ],
  },
];

const industries = [
  {
    slug: 'smartphones',
    name: 'Smartphones',
    image: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=600&q=85',
    desc: 'iPhone, Android: pantallas, BGA, hidrogeles.',
    detalleAnchor: 'reparaciones',
  },
  {
    slug: 'tablets-ipad',
    name: 'Tablets e iPad',
    image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=600&q=85',
    desc: 'Glass, conectores de carga y diagnosis de placa.',
    detalleAnchor: 'reparaciones',
  },
  {
    slug: 'tv-panel',
    name: 'TV y monitores',
    image: 'https://images.unsplash.com/photo-1461151304267-38535e780c79?auto=format&fit=crop&w=600&q=85',
    desc: 'LED/OLED, fuentes, backlights y smart TV.',
    detalleAnchor: 'inventario',
  },
  {
    slug: 'drones',
    name: 'Drones',
    image: 'https://images.unsplash.com/photo-1521405924368-64c5b84bec60?auto=format&fit=crop&w=600&q=85',
    desc: 'Gimbals, motores ESC y electrónica de vuelo.',
    detalleAnchor: 'reparaciones',
  },
  {
    slug: 'audio-hifi',
    name: 'Audio / Hi-Fi',
    image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=600&q=85',
    desc: 'Auriculares, altavoces y equipos de estudio.',
    detalleAnchor: 'pos',
  },
  {
    slug: 'consolas',
    name: 'Consolas',
    image: 'https://images.unsplash.com/photo-1605901309584-818e25960a8f?auto=format&fit=crop&w=600&q=85',
    desc: 'PS, Xbox, Switch: HDMI, refrigeración, SSD.',
    detalleAnchor: 'reparaciones',
  },
  {
    slug: 'microelectronica',
    name: 'Microelectrónica',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=85',
    desc: 'Estación de soldadura, microscopio, boards.',
    detalleAnchor: 'inventario',
  },
  {
    slug: 'wearables',
    name: 'Wearables',
    image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&w=600&q=85',
    desc: 'Relojes inteligentes y accesorios conectados.',
    detalleAnchor: 'reparaciones',
  },
];

export default async function HomePage() {
  return (
    <div className="min-h-screen bg-[#0D1117] text-white overflow-x-visible">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-80">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-[#F5C518]/20 blur-[120px]" />
        <div className="absolute top-1/3 -left-32 h-80 w-80 rounded-full bg-[#F5C518]/10 blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-[#F5C518]/10 blur-[90px]" />
      </div>

      <LandingSiteHeader />

      {/* Reserva altura del header fijo para que el hero no quede debajo */}
      <div data-web-chrome className="h-[72px] lg:h-20 shrink-0" aria-hidden />

      <section className="relative w-full overflow-visible bg-[#0D1117] text-white border-b border-white/5">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L60 30L30 60L0 30Z' fill='none' stroke='%23F5C518' stroke-width='0.5'/%3E%3C/svg%3E")`,
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#F5C518]/10 via-transparent to-[#0D1117]" />
        <div className="absolute top-24 right-[12%] text-white/20 text-lg select-none">✦</div>
        <div className="absolute top-[40%] right-[8%] text-white/15 text-sm select-none">✦</div>
        <div className="absolute bottom-32 left-[20%] text-white/15 text-sm select-none">✦</div>

        <div className="relative z-10 w-full min-w-0 px-3 xs:px-4 sm:px-8 lg:px-6 xl:px-8 2xl:px-12 pt-8 xs:pt-10 pb-12 xs:pb-14 sm:pt-12 sm:pb-16 lg:pt-16 lg:pb-20 overflow-visible">
          <div className="mx-auto flex max-w-[1920px] min-w-0 flex-col items-center gap-8 xs:gap-10 lg:flex-row lg:items-center lg:gap-8 overflow-visible">
            <div className="mx-auto min-w-0 max-w-xl lg:max-w-[42%] text-center lg:mx-0 lg:text-left shrink-0 z-20">
              <p className="text-sm font-medium text-[#F5C518] mb-4 flex items-center justify-center lg:justify-start gap-2">
                <Sparkles className="h-4 w-4 shrink-0" />
                Software de gestión para servicios técnicos con facturación ARCA e IA integrada
              </p>
              <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] xl:text-[3.5rem] font-bold leading-[1.12] tracking-tight mb-6 text-balance">
                <span className="text-[#F5C518]">JC ONE FIX:</span>
                <span className="text-white"> Chau Caos de Excel.</span>
                <br className="hidden sm:block" />
                <span className="text-white">Gestioná tu taller con IA.</span>
              </h1>
              <p className="text-lg text-slate-300 leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0">
                El único software en Argentina que redacta tus informes técnicos por WhatsApp con{' '}
                <span className="text-[#F5C518] font-medium">IA Gemini</span> en segundos. Importá tu base de datos y validá tu taller ante{' '}
                <span className="text-slate-200 font-medium">AFIP</span> sin vueltas.
              </p>
              <div className="flex flex-col xs:flex-row flex-wrap gap-3 mb-8 justify-center lg:justify-start">
                <Link href="/register" className="w-full xs:w-auto">
                  <Button className="w-full xs:w-auto rounded-full bg-[#F5C518] text-[#0D1117] hover:bg-[#D4A915] font-semibold h-12 px-6 xs:px-8 border-0 text-sm xs:text-base shadow-lg shadow-[#F5C518]/20 min-h-[48px]">
                    ¡Empezar mis 30 días GRATIS!
                  </Button>
                </Link>
                <Link href="#pricing" className="w-full xs:w-auto">
                  <Button
                    variant="outline"
                    className="w-full xs:w-auto rounded-full h-12 px-6 xs:px-8 border-2 border-white/35 text-white bg-white/5 hover:bg-white/10 font-semibold backdrop-blur-sm text-sm xs:text-base"
                  >
                    Ver Precios ARS
                  </Button>
                </Link>
              </div>
              <p className="text-sm text-slate-500 max-w-lg mx-auto lg:mx-0">
                Sin tarjeta. Solo 4 datos y ya estás adentro.
              </p>
            </div>

            <div className="relative w-full lg:w-[58%] xl:w-[55%] min-h-[450px] sm:min-h-[550px] lg:min-h-[650px] overflow-visible">
              {/* Estados solo en márgenes (fondo rombos); debajo del visual para no caer sobre la foto */}
              <HeroTicketStatusOrbit />
              <div className="relative z-10 h-full overflow-visible pt-4">
                <HeroSellingVisual />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Franja "40+ socios": oculta (claim demo); PartnersMarquee conserva el markup. */}
      <PartnersMarquee tone="dark" hidden />

      <QueIncluyeSection modules={modulosOferta} />

      <div className="hidden lg:block">
        <ImportDemoInteractive />
      </div>

      <section
        id="modulos-detalle"
        className="hidden lg:block scroll-mt-[5.5rem] border-y border-white/5 bg-[#0a0e14]/95 py-14 text-white sm:scroll-mt-28 sm:py-20"
      >
        <div className="w-full min-w-0 px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-24">
          <div className="max-w-2xl mx-auto text-center mb-10 lg:mb-14">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F5C518] mb-3">Todo en un solo panel</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-4 leading-tight text-white">
              Explora cada módulo
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed">
              Haz clic en cualquier icono para ver en detalle lo que incluye.
            </p>
          </div>
          <ModulosFichasShowcase
            modules={modulosOferta.map(({ id, title, tagline, bullets, image }) => ({
              id,
              title,
              tagline,
              bullets,
              image,
            }))}
          />
          <p className="mt-10 text-center text-sm text-slate-500">
            <Link
              href="#que-incluye"
              className="inline-flex items-center gap-2 font-semibold text-[#F5C518] hover:text-[#D4A915]"
            >
              Volver al resumen de módulos <ArrowRight className="h-4 w-4 rotate-180" />
            </Link>
          </p>
        </div>
      </section>


      <div className="hidden lg:block">
        <FeaturesSection />
      </div>

      <section id="pricing" className="relative scroll-mt-[5.5rem] py-14 sm:scroll-mt-24 sm:py-20">
        <div className="w-full min-w-0 px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-24">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-3 leading-tight">
              <span className="text-white">Invertí en tu taller, </span>
              <span className="text-[#F5C518]">no solo en un software.</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-3xl mx-auto">
              Un solo precio final para tener a <span className="text-[#F5C518] font-medium">Gemini</span> trabajando con vos. Sin sorpresas, sin límites de técnicos y listo para Argentina.
            </p>
          </div>
          <PricingWithLead />
        </div>
      </section>

      {/* SECCIÓN INDUSTRIAS OCULTA - Descomentar para mostrar */}
      <section
        id="industries"
        className="scroll-mt-[5.5rem] border-t border-white/5 bg-[#0D1117] py-14 sm:scroll-mt-24 sm:py-20 hidden"
      >
        <div className="px-4 sm:px-6 md:px-10 lg:px-[80px] xl:px-[80px]">
          {/* Header */}
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F5C518] mb-3">Sectores</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white">
              Industrias que <span className="text-[#F5C518]">servimos</span>
            </h2>
            <p className="text-slate-500 text-sm mt-3 max-w-md mx-auto leading-relaxed">
              Un solo panel para cualquier vertical de reparación electrónica.{' '}
              <Link href="/rubros" className="text-[#F5C518]/90 hover:text-[#F5C518] underline-offset-2 hover:underline">
                Páginas por rubro
              </Link>
              {' · '}
              <Link href="/soluciones" className="text-[#F5C518]/90 hover:text-[#F5C518] underline-offset-2 hover:underline">
                Soluciones (Argentina)
              </Link>
            </p>
          </div>

          {/* Grid 8 columnas — halo Gold; huecos un poco más cerrados */}
          <div className="grid grid-cols-2 justify-items-center gap-x-3 gap-y-9 pt-2 pb-4 sm:grid-cols-4 sm:gap-x-5 lg:grid-cols-8 lg:gap-x-3 xl:gap-x-5">
            {industries.map((ind) => (
              <Link
                key={ind.slug}
                href={`#detalle-${ind.detalleAnchor}`}
                id={`rubro-${ind.slug}`}
                scroll={false}
                className="group flex flex-col items-center gap-3 focus-visible:outline-none w-full max-w-[168px]"
              >
                {/* Anillo + glow (misma familia que PricingWithLead: shadow + ring Gold) */}
                <div
                  className="h-[120px] w-[120px] sm:h-[140px] sm:w-[140px] flex-shrink-0 rounded-full bg-gradient-to-br from-[#F5C518]/35 via-transparent to-[#F5C518]/10 p-[3px] ring-1 ring-[#F5C518]/20 shadow-[0_0_28px_rgba(245,197,24,0.18)] transition-all duration-300 group-hover:from-[#F5C518] group-hover:via-[#F5C518]/60 group-hover:to-[#F5C518]/25 group-hover:scale-110 group-hover:shadow-[0_0_44px_rgba(245,197,24,0.38)] group-hover:ring-[#F5C518]/45"
                >
                  <div className="relative h-full w-full overflow-hidden rounded-full bg-[#0D1117]">
                    <Image
                      src={ind.image}
                      alt={`Servicio técnico ${ind.name} — software de taller y órdenes de reparación Jconefix Argentina`}
                      fill
                      sizes="(max-width: 640px) 120px, 140px"
                      className="object-cover opacity-75 transition-all duration-500 group-hover:opacity-100"
                    />
                  </div>
                </div>
                <p className="text-center text-xs sm:text-sm font-semibold text-white leading-tight transition-colors duration-200 group-hover:text-[#F5C518]">
                  {ind.name}
                </p>
                <p className="text-center text-[11px] text-slate-500 leading-snug group-hover:text-slate-300 transition-colors duration-200 px-1">
                  {ind.desc}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="hidden lg:block relative min-h-[min(28rem,85svh)] overflow-hidden border-y border-white/5 bg-[#0D1117] py-14 sm:py-20 lg:min-h-[420px]">
        {/* Oscuro + halos suaves Gold (sin rejilla de rombos) */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute -top-36 -right-24 h-[22rem] w-[22rem] rounded-full bg-[#F5C518]/15 blur-[110px] opacity-75" />
          <div className="absolute top-1/2 -left-28 h-72 w-72 -translate-y-1/2 rounded-full bg-[#F5C518]/10 blur-[95px]" />
          <div className="absolute bottom-0 right-[28%] h-52 w-52 rounded-full bg-[#F5C518]/10 blur-[85px]" />
        </div>
        <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-br from-[#F5C518]/10 via-transparent to-[#0D1117]" />
        <div className="relative z-10 mx-auto grid w-full min-w-0 max-w-[1920px] grid-cols-1 items-center gap-10 px-4 sm:px-8 lg:grid-cols-2 lg:px-12 xl:px-16 2xl:px-24">
          <div className="mx-auto min-w-0 max-w-xl text-center lg:mx-0 lg:text-left">
            <div className="inline-flex items-center gap-2 text-[#F5C518] text-xs font-semibold mb-4">
              <Zap className="h-4 w-4" />
              Control remoto en tiempo real
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-4 leading-tight">
              <span className="text-white">Tu taller bajo control, </span>
              <span className="text-[#F5C518]">estés donde estés</span>
            </h2>
            <p className="text-white/75 mb-6 max-w-lg leading-relaxed">
              Mirá en vivo cómo entran los equipos, qué presupuestos acepta la IA y cuánto dinero ingresa hoy. Una gestión sólida para una mano de obra profesional.
            </p>
            <Link href="/register">
              <Button className="bg-[#F5C518] text-[#0D1117] hover:bg-[#D4A915] font-semibold h-11 px-7 border-0 shadow-lg shadow-[#F5C518]/20 motion-safe:animate-pulse min-h-[48px]">
                Prueba gratis 30 días
              </Button>
            </Link>
          </div>
          <div className="relative min-w-0">
            {/* Resplandor Gold detrás del panel (como checkout / acentos neo) */}
            <div className="pointer-events-none absolute -inset-5 sm:-inset-7 rounded-[2.25rem] bg-[#F5C518] opacity-[0.11] blur-[52px] -z-10" />
            <div className="pointer-events-none absolute -bottom-3 left-1/2 h-28 w-[min(100%,24rem)] -translate-x-1/2 rounded-full bg-[#F5C518] opacity-[0.13] blur-[38px] -z-10" />
            <LiveActivityCarousel />
          </div>
        </div>
      </section>

      <MarketingFooter variant="dark" />
    </div>
  );
}

/** Composición tipo RepairDesk: persona satisfecha + mockup del producto + acentos que venden. */
function HeroFloatIcon({ Icon, className }: { Icon: typeof Wrench; className: string }) {
  return (
    <div
      className={`absolute flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-white/[0.14] backdrop-blur-md border border-white/40 text-white shadow-[0_8px_28px_rgba(0,0,0,0.45)] motion-safe:animate-pulse ${className}`}
    >
      <Icon className="h-[18px] w-[18px] sm:h-5 sm:w-5" strokeWidth={2.2} />
    </div>
  );
}

function HeroSellingVisual() {
  return (
    <div className="relative w-full min-h-[500px] sm:min-h-[600px] lg:min-h-[720px] overflow-visible">
      <div className="relative z-10 w-full flex items-start justify-center overflow-visible px-2 pt-8 sm:pt-12">
        <div className="relative w-auto flex justify-center items-start overflow-visible">
          {/* Efectos de iluminación tipo TechFlow - múltiples halos dorados difuminados */}
          {/* Halo principal superior - luz más intensa */}
          <div className="pointer-events-none absolute top-[5%] left-1/2 h-[50%] w-[90%] -translate-x-1/2 rounded-full bg-[#F5C518] opacity-[0.18] blur-[80px] -z-10" />
          {/* Halo secundario superior izquierdo */}
          <div className="pointer-events-none absolute top-[8%] left-[20%] h-[35%] w-[45%] rounded-full bg-[#F5C518] opacity-[0.14] blur-[60px] -z-10" />
          {/* Halo secundario superior derecho */}
          <div className="pointer-events-none absolute top-[12%] right-[15%] h-[30%] w-[40%] rounded-full bg-[#D4A915] opacity-[0.12] blur-[55px] -z-10" />
          {/* Halo central - iluminación general del iMac */}
          <div className="pointer-events-none absolute top-[25%] left-1/2 h-[45%] w-[75%] -translate-x-1/2 rounded-full bg-[#F5C518] opacity-[0.10] blur-[70px] -z-10" />
          {/* Halo inferior - resplandor de la base/tablet */}
          <div className="pointer-events-none absolute bottom-[10%] left-1/2 h-[35%] w-[65%] -translate-x-1/2 rounded-full bg-[#E6B800] opacity-[0.13] blur-[55px] -z-10" />
          {/* Halo sutil inferior izquierdo */}
          <div className="pointer-events-none absolute bottom-[20%] left-[25%] h-[25%] w-[35%] rounded-full bg-[#F5C518] opacity-[0.09] blur-[45px] -z-10" />
          {/* Halo sutil inferior derecho */}
          <div className="pointer-events-none absolute bottom-[15%] right-[20%] h-[20%] w-[30%] rounded-full bg-[#D4A915] opacity-[0.08] blur-[40px] -z-10" />

          <HeroFloatIcon Icon={Package} className="top-[12%] left-0 z-20 sm:-top-1 sm:-left-1" />
          <HeroFloatIcon Icon={Calendar} className="top-[16%] -right-2 z-20 sm:-right-3" />
          <HeroFloatIcon Icon={Ticket} className="top-[45%] -left-3 z-20 sm:-left-4" />
          <HeroFloatIcon Icon={CreditCard} className="bottom-[28%] -right-2 z-20 sm:-right-3" />
          <HeroFloatIcon Icon={BarChart3} className="bottom-[6%] left-[8%] z-20" />
          <HeroFloatIcon Icon={MessageSquare} className="top-[52%] right-[6%] z-20" />
          <HeroFloatIcon Icon={Cpu} className="bottom-[42%] left-0 z-20 sm:-left-2" />

          <Image
            src="/g.png"
            alt="Interfaz de gestión de servicio técnico, facturación ARCA y órdenes de reparación — Jconefix"
            width={1280}
            height={1560}
            priority
            className="relative z-10 h-auto w-full max-w-[100%] sm:max-w-[95%] lg:max-w-[110%] max-h-[75vh] sm:max-h-[80vh] lg:max-h-[85vh] object-contain object-center mt-4 sm:mt-6 drop-shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
          />
        </div>

      </div>
    </div>
  );
}



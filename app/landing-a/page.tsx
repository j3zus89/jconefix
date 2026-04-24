'use client';

import { Button } from '@/components/ui/button';
import { 
  Star, Facebook, Twitter, Instagram, Linkedin, 
  Package, CreditCard, Calendar, Monitor, MessageSquare, 
  Users, BarChart3, FileText, Bot, Phone, Camera, Gem, Clock, 
  Mail, MessageCircle, Play, ClipboardCheck, Smartphone
} from 'lucide-react';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { JcOneFixMark, JcOneFixAppIcon } from '@/components/jc-one-fix-mark';
import { NOTIFICATIONS_INBOX_EMAIL } from '@/lib/notifications/notifications-inbox';

export default function Home() {
  const [activeFeature, setActiveFeature] = useState(0);
  
  const features: {
    icon: typeof Package;
    title: string;
    shortLabel: string;
    description: ReactNode;
    link: string;
    linkText: string;
    image: string;
  }[] = [
    {
      icon: Package,
      title: 'Gestión de Inventario',
      shortLabel: 'Gestión de\nInventario',
      description: (
        <>
          Haz que la gestión de inventario sea sencilla con el potente software de gestión de inventario de{' '}
          <JcOneFixMark tone="onLight" className="font-semibold" /> que simplifica el seguimiento, pedidos y
          reabastecimiento. Crea fácilmente inventario serializado, Órdenes de Compra y GRNs, transfiere tu inventario
          de una tienda a otra y realiza conteos de inventario.
        </>
      ),
      link: 'software de gestión de inventario',
      linkText: 'software de gestión de inventario',
      image: 'inventory'
    },
    {
      icon: CreditCard,
      title: 'Pagos Integrados',
      shortLabel: 'Pagos\nIntegrados',
      description: 'Agiliza la facturación y haz que la recolección de pagos de clientes sea fluida, transparente y segura con múltiples métodos de pago integrados. Acepta débito, crédito, contactless, pagos en línea o digitales a través de Square, PayPal, Stripe y más.',
      link: 'pago integrado',
      linkText: 'métodos de pago integrados',
      image: 'payments'
    },
    {
      icon: Calendar,
      title: 'Programación de Citas',
      shortLabel: 'Programación de\nCitas',
      description: (
        <>
          Convierte los visitantes de tu sitio web en clientes con el módulo de citas en línea de{' '}
          <JcOneFixMark tone="onLight" className="font-semibold" />. La función innovadora facilita que tus clientes
          agenden citas en cualquier momento. Con opciones personalizables y una interfaz intuitiva, programa,
          reprograma y realiza seguimiento de citas en tiempo real.
        </>
      ),
      link: 'citas en línea',
      linkText: 'citas en línea',
      image: 'appointments'
    },
    {
      icon: Monitor,
      title: 'Software Punto de Venta',
      shortLabel: 'Software Punto de\nVenta',
      description: 'Genera más ingresos y proporciona una excelente experiencia de checkout a tus clientes con un completo software POS que tiene todo lo que necesitas para las operaciones de tu negocio. Vende más servicios de reparación, accesorios y gadgets, genera e imprime facturas, recolecta pagos y más.',
      link: 'software POS',
      linkText: 'software POS',
      image: 'pos'
    },
    {
      icon: MessageSquare,
      title: 'SMS y Email Notificación',
      shortLabel: 'Notificaciones SMS\ny Email',
      description: (
        <>
          Mantente conectado con tus clientes sin esfuerzo usando la función de notificaciones SMS y email de{' '}
          <JcOneFixMark tone="onLight" className="font-semibold" />. Envía actualizaciones automatizadas,
          recordatorios y notificaciones instantáneamente para mantener informados a los clientes en cada paso del
          proceso.
        </>
      ),
      link: 'notificaciones SMS y email',
      linkText: 'notificaciones SMS y email',
      image: 'notifications'
    },
    {
      icon: Users,
      title: 'Gestión de Empleados',
      shortLabel: 'Gestión de\nEmpleados',
      description: 'Gestiona tu taller de reparación eficientemente con un sistema de gestión de empleados que te permite asignar tareas, establecer roles y permisos distintivos para empleados, registrar horas de inicio y fin de turnos, realizar seguimiento activo del progreso del trabajo y monitorear la productividad con facilidad.',
      link: 'sistema de gestión de empleados',
      linkText: 'sistema de gestión de empleados',
      image: 'employees'
    },
    {
      icon: BarChart3,
      title: 'Reportes de Negocio',
      shortLabel: 'Reportes de\nNegocio',
      description: (
        <>
          Obtén información valiosa sobre tu negocio de reparación con el potente software de reportes de{' '}
          <JcOneFixMark tone="onLight" className="font-semibold" />. Las herramientas integrales de reportes te permiten
          rastrear métricas clave, analizar el rendimiento y tomar decisiones basadas en datos con facilidad.
        </>
      ),
      link: 'software de reportes',
      linkText: 'software de reportes',
      image: 'reporting'
    },
    {
      icon: FileText,
      title: 'Gestión de Tickets de Reparación',
      shortLabel: 'Gestión de Tickets\nde Reparación',
      description: (
        <>
          El intuitivo sistema de gestión de tickets de reparación de <JcOneFixMark tone="onLight" className="font-semibold" />{' '}
          te permite crear tickets detallados para rastrear órdenes de reparación sin esfuerzo. Crea flujos de trabajo
          personalizados y asegura que cada paso de la reparación se complete en la secuencia que desees.
        </>
      ),
      link: 'sistema de gestión de tickets de reparación',
      linkText: 'sistema de gestión de tickets',
      image: 'tickets'
    }
  ];
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav data-web-chrome className="sticky top-0 z-50 w-full bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="flex justify-between items-center h-20">
            <Link href="/" className="flex items-center gap-2 group">
              <JcOneFixAppIcon className="rounded-lg transition-opacity group-hover:opacity-90" />
              <JcOneFixMark tone="onLight" className="text-xl font-bold tracking-tight" />
            </Link>
            <div className="hidden lg:flex items-center gap-8">
              <Link href="#features" className="text-sm font-medium text-slate-700 hover:text-[#0D1117] transition-colors">Productos</Link>
              <Link href="#features" className="text-sm font-medium text-slate-700 hover:text-[#0D1117] transition-colors">Características</Link>
              <Link href="#pricing" className="text-sm font-medium text-slate-700 hover:text-[#0D1117] transition-colors">Precios</Link>
              <Link href="#integrations" className="text-sm font-medium text-slate-700 hover:text-[#0D1117] transition-colors">Integraciones</Link>
              <Link href="#industries" className="text-sm font-medium text-slate-700 hover:text-[#0D1117] transition-colors">Industrias</Link>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login" className="hidden md:block text-sm font-semibold text-slate-700 hover:text-[#0D1117] transition-colors">Iniciar sesión</Link>
              <Link href="/checkout?plan=basico&cycle=mensual">
                <Button className="bg-[#F5C518] text-[#0D1117] hover:bg-[#D4A915] font-semibold rounded-md px-5 h-10 text-sm border-0">
                  Prueba Gratis
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative bg-[#0D1117] overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative z-10 max-w-2xl">
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-bold text-[#F5C518] mb-6 leading-[1.05] tracking-tight drop-shadow-lg">
                Impulsa el Crecimiento de tu Taller
              </h1>
              <p className="text-lg text-white/80 mb-8 leading-relaxed max-w-xl">
                La plataforma líder para puntos de venta y gestión de reparaciones. Diseñada para profesionales.
              </p>
              <div className="flex flex-wrap gap-4 mb-6">
                <Link href="/checkout?plan=basico&cycle=mensual">
                  <Button className="bg-[#F5C518] text-[#0D1117] hover:bg-[#D4A915] font-semibold rounded-md px-6 h-11 text-sm border-0">
                    Comenzar Mi Prueba Gratis
                  </Button>
                </Link>
                <Button variant="outline" className="border-white/40 text-white hover:bg-white/10 font-semibold rounded-md px-6 h-11 text-sm bg-transparent">
                  Ver Precios
                </Button>
              </div>
              {/* Oculto: evita publicidad engañosa; no eliminar por si se reutiliza el copy. */}
              <p className="hidden text-white/60 text-sm" aria-hidden>
                Impulsado por más de 40 Socios Integrados
              </p>
            </div>

            <div className="relative hidden lg:block h-[800px]">
              {/* Iconos flotantes alrededor del técnico */}
              <div className="absolute top-20 left-10 z-10 animate-pulse">
                <JcOneFixAppIcon className="h-14 w-14 rounded-2xl border border-white/30 shadow-lg" />
              </div>
              <div className="absolute top-40 left-0 z-10 animate-pulse" style={{animationDelay: '0.5s'}}>
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30 shadow-lg">
                  <ClipboardCheck className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="absolute bottom-40 left-20 z-10 animate-pulse" style={{animationDelay: '1s'}}>
                <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 shadow-lg">
                  <Calendar className="w-7 h-7 text-white" />
                </div>
              </div>
              <div className="absolute top-32 right-20 z-10 animate-pulse" style={{animationDelay: '1.5s'}}>
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30 shadow-lg">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="absolute bottom-32 right-10 z-10 animate-pulse" style={{animationDelay: '2s'}}>
                <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 shadow-lg">
                  <Users className="w-7 h-7 text-white" />
                </div>
              </div>
              <div className="absolute top-10 right-40 z-10 animate-pulse" style={{animationDelay: '0.3s'}}>
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center border border-white/30 shadow-lg">
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="absolute bottom-20 left-5 z-10 animate-pulse" style={{animationDelay: '1.2s'}}>
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center border border-white/30 shadow-lg">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
              </div>
              
              <img 
                src="/geminix.png" 
                alt="Técnico profesional JC ONE FIX"
                className="w-full h-full object-contain object-right scale-[2.05] origin-right translate-x-16 sm:translate-x-20"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Partner Logos — oculto (demo); markup conservado. */}
      <section
        className="hidden py-12 bg-slate-50 border-y border-slate-200 overflow-hidden"
        aria-hidden
      >
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 mb-8">
          <p className="text-center text-sm text-slate-500">
            Powered by a Suite of 40+ Integrated Partners
          </p>
        </div>
        <div className="flex animate-marquee">
          {/* Primera fila de logos */}
          <div className="flex items-center gap-12 px-6">
            {/* Zapier */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-2xl font-bold text-orange-500">_</span>
              <span className="text-xl font-bold text-slate-700">zapier</span>
            </div>
            {/* Shopify */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[#0D1117] text-2xl">🛍</span>
              <span className="text-lg font-bold text-slate-700">shopify</span>
            </div>
            {/* Mobile Denzo */}
            <div className="flex items-center shrink-0">
              <span className="text-lg font-bold text-slate-600">mobile<span className="text-blue-400">Denzo</span></span>
            </div>
            {/* Woo */}
            <div className="flex items-center shrink-0">
              <span className="text-2xl font-bold text-purple-600">WOO</span>
            </div>
            {/* Modo Official Partner */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="bg-purple-900 text-white px-2 py-1 text-xs font-bold rounded">MOD</span>
              <span className="text-xs text-slate-500 leading-tight">OFFICIAL<br/>PARTNER</span>
            </div>
            {/* Xero */}
            <div className="flex items-center justify-center w-16 h-16 bg-[#13B5EA] rounded-full shrink-0">
              <span className="text-white font-bold text-xl">xero</span>
            </div>
            {/* Mobile Sentrix */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-red-600 text-2xl">📱</span>
              <div className="leading-tight">
                <span className="text-xs text-slate-500">mobile</span>
                <span className="text-lg font-bold text-slate-700 block">Sentrix</span>
              </div>
            </div>
            {/* Injured Gadgets */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[#0D1117] text-2xl">🎯</span>
              <span className="text-sm font-bold text-slate-700">Injured<br/>Gadgets</span>
            </div>
          </div>
          {/* Segunda fila duplicada para efecto infinito */}
          <div className="flex items-center gap-12 px-6">
            {/* Zapier */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-2xl font-bold text-orange-500">_</span>
              <span className="text-xl font-bold text-slate-700">zapier</span>
            </div>
            {/* Shopify */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[#0D1117] text-2xl">🛍</span>
              <span className="text-lg font-bold text-slate-700">shopify</span>
            </div>
            {/* Mobile Denzo */}
            <div className="flex items-center shrink-0">
              <span className="text-lg font-bold text-slate-600">mobile<span className="text-blue-400">Denzo</span></span>
            </div>
            {/* Woo */}
            <div className="flex items-center shrink-0">
              <span className="text-2xl font-bold text-purple-600">WOO</span>
            </div>
            {/* Modo Official Partner */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="bg-purple-900 text-white px-2 py-1 text-xs font-bold rounded">MOD</span>
              <span className="text-xs text-slate-500 leading-tight">OFFICIAL<br/>PARTNER</span>
            </div>
            {/* Xero */}
            <div className="flex items-center justify-center w-16 h-16 bg-[#13B5EA] rounded-full shrink-0">
              <span className="text-white font-bold text-xl">xero</span>
            </div>
            {/* Mobile Sentrix */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[#0D1117] text-2xl">📱</span>
              <div className="leading-tight">
                <span className="text-xs text-slate-500">mobile</span>
                <span className="text-lg font-bold text-slate-700 block">Sentrix</span>
              </div>
            </div>
            {/* Injured Gadgets */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[#0D1117] text-2xl">🎯</span>
              <span className="text-sm font-bold text-slate-700">Injured<br/>Gadgets</span>
            </div>
          </div>
          {/* Tercera fila duplicada para efecto infinito sin espacios */}
          <div className="flex items-center gap-12 px-6">
            {/* Zapier */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-2xl font-bold text-orange-500">_</span>
              <span className="text-xl font-bold text-slate-700">zapier</span>
            </div>
            {/* Shopify */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[#0D1117] text-2xl">🛍</span>
              <span className="text-lg font-bold text-slate-700">shopify</span>
            </div>
            {/* Mobile Denzo */}
            <div className="flex items-center shrink-0">
              <span className="text-lg font-bold text-slate-600">mobile<span className="text-blue-400">Denzo</span></span>
            </div>
            {/* Woo */}
            <div className="flex items-center shrink-0">
              <span className="text-2xl font-bold text-purple-600">WOO</span>
            </div>
            {/* Modo Official Partner */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="bg-purple-900 text-white px-2 py-1 text-xs font-bold rounded">MOD</span>
              <span className="text-xs text-slate-500 leading-tight">OFFICIAL<br/>PARTNER</span>
            </div>
            {/* Xero */}
            <div className="flex items-center justify-center w-16 h-16 bg-[#13B5EA] rounded-full shrink-0">
              <span className="text-white font-bold text-xl">xero</span>
            </div>
            {/* Mobile Sentrix */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[#0D1117] text-2xl">📱</span>
              <div className="leading-tight">
                <span className="text-xs text-slate-500">mobile</span>
                <span className="text-lg font-bold text-slate-700 block">Sentrix</span>
              </div>
            </div>
            {/* Injured Gadgets */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[#0D1117] text-2xl">🎯</span>
              <span className="text-sm font-bold text-slate-700">Injured<br/>Gadgets</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-[#faf9f6]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="text-center mb-12">
            <h2 className="font-serif text-4xl font-bold text-slate-900 mb-3">
              Control de Gestión de Talleres
            </h2>
            <p className="text-base text-slate-600 max-w-3xl mx-auto">
              Una plataforma rica en funciones para consolidar, optimizar y gestionar las operaciones de tu negocio de reparación.
            </p>
          </div>

          {/* Feature Icons - Hover tabs */}
          <div className="flex flex-wrap justify-center gap-6 mb-12">
            {features.map((feature, i) => (
              <div 
                key={i} 
                onMouseEnter={() => setActiveFeature(i)}
                className={`flex flex-col items-center text-center w-24 transition-all cursor-pointer ${
                  activeFeature === i ? 'scale-110' : 'opacity-70 hover:opacity-100'
                }`}
              >
                <div className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center mb-2 transition-all ${
                  activeFeature === i 
                    ? 'bg-white border-[#0D1117] shadow-lg' 
                    : 'bg-white border-slate-200 hover:border-[#0D1117]/50'
                }`}>
                  <feature.icon className={`h-6 w-6 ${
                    activeFeature === i ? 'text-[#0D1117]' : 'text-slate-500'
                  }`} />
                </div>
                <span className={`text-xs leading-tight whitespace-pre-line ${
                  activeFeature === i 
                    ? 'text-[#0D1117] font-semibold' 
                    : 'text-slate-600'
                }`}>
                  {feature.shortLabel}
                </span>
              </div>
            ))}
          </div>

          {/* Feature Detail Content */}
          <div className="bg-white rounded-3xl p-8 lg:p-12 shadow-sm border border-slate-100">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              {/* Left - Mockup Image */}
              <div className="relative order-2 lg:order-1">
                <div className="bg-[#f5f5dc] rounded-2xl p-4 lg:p-6 relative">
                  {/* Mockup Browser Window */}
                  <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    {/* Browser Header */}
                    <div className="bg-slate-100 px-4 py-3 flex items-center gap-2 border-b">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                        <div className="w-3 h-3 rounded-full bg-[#0D1117]"></div>
                      </div>
                      <div className="flex-1 flex justify-center">
                        <div className="bg-white px-4 py-1 rounded text-xs text-slate-400 flex items-center justify-center gap-1 flex-wrap">
                          <JcOneFixMark tone="onLight" className="text-xs" />
                          <span>Dashboard</span>
                        </div>
                      </div>
                    </div>
                    {/* Content based on active feature */}
                    <div className="p-4 lg:p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-[#0D1117]/10 flex items-center justify-center">
                          {(() => {
                            const Icon = features[activeFeature].icon;
                            return <Icon className="h-5 w-5 text-[#0D1117]" />;
                          })()}
                        </div>
                        <h4 className="font-semibold text-slate-900">{features[activeFeature].title}</h4>
                      </div>
                      
                      {/* Feature-specific mockup content */}
                      <div className="space-y-3">
                        {activeFeature === 0 && (
                          <>
                            <div className="flex justify-between text-sm text-slate-600 border-b pb-2">
                              <span>Valor de Stock</span>
                              <span className="font-semibold">$45,230</span>
                            </div>
                            <div className="flex justify-between text-sm text-slate-600 border-b pb-2">
                              <span>Artículos con Stock Bajo</span>
                              <span className="text-amber-600 font-semibold">12 items</span>
                            </div>
                            <div className="h-20 bg-slate-50 rounded flex items-end p-2 gap-1">
                              <div className="flex-1 bg-[#0D1117] rounded" style={{height: '60%'}}></div>
                              <div className="flex-1 bg-[#0D1117] rounded" style={{height: '80%'}}></div>
                              <div className="flex-1 bg-[#0D1117] rounded" style={{height: '45%'}}></div>
                              <div className="flex-1 bg-[#0D1117] rounded" style={{height: '90%'}}></div>
                            </div>
                          </>
                        )}
                        {activeFeature === 1 && (
                          <>
                            <div className="text-center py-4">
                              <CreditCard className="h-12 w-12 text-[#0D1117] mx-auto mb-2" />
                              <p className="text-sm text-slate-600">Procesar Pago</p>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Monto</span>
                                <span className="font-semibold">$125.00</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Método</span>
                                <span className="text-[#0D1117]">Tarjeta</span>
                              </div>
                            </div>
                          </>
                        )}
                        {activeFeature === 2 && (
                          <>
                            <div className="grid grid-cols-7 gap-1 text-center text-xs mb-3">
                              {['L','M','X','J','V','S','D'].map((d, i) => (
                                <div key={i} className="text-slate-500">{d}</div>
                              ))}
                            </div>
                            <div className="space-y-2">
                              <div className="bg-[#0D1117] text-white text-sm p-2 rounded">10:00 AM - Reparación iPhone</div>
                              <div className="bg-[#0D1117]/80 text-white text-sm p-2 rounded">2:00 PM - Diagnóstico Samsung</div>
                            </div>
                          </>
                        )}
                        {activeFeature === 3 && (
                          <>
                            <div className="grid grid-cols-3 gap-2 mb-3">
                              <div className="bg-[#0D1117] text-white p-3 rounded text-center text-xs">Ventas</div>
                              <div className="bg-slate-100 p-3 rounded text-center text-xs text-slate-600">Reparaciones</div>
                              <div className="bg-slate-100 p-3 rounded text-center text-xs text-slate-600">Inventario</div>
                            </div>
                            <div className="text-center py-2">
                              <p className="text-2xl font-bold text-[#0D1117]">$2,450</p>
                              <p className="text-xs text-slate-500">Ventas Hoy</p>
                            </div>
                          </>
                        )}
                        {activeFeature === 4 && (
                          <>
                            <div className="space-y-3">
                              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded">
                                <MessageSquare className="h-5 w-5 text-[#0D1117]" />
                                <div>
                                  <p className="text-sm font-medium">SMS Enviado</p>
                                  <p className="text-xs text-slate-500">Su reparación está lista</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded">
                                <Mail className="h-5 w-5 text-blue-500" />
                                <div>
                                  <p className="text-sm font-medium">Email Enviado</p>
                                  <p className="text-xs text-slate-500">Factura #1234</p>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                        {activeFeature === 5 && (
                          <>
                            <div className="space-y-2">
                              <div className="flex items-center gap-3 p-2 border rounded">
                                <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium">Juan Pérez</p>
                                  <p className="text-xs text-slate-500">Técnico</p>
                                </div>
                                <span className="text-xs text-[#0D1117]">Activo</span>
                              </div>
                              <div className="flex items-center gap-3 p-2 border rounded">
                                <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium">María García</p>
                                  <p className="text-xs text-slate-500">Recepcionista</p>
                                </div>
                                <span className="text-xs text-[#0D1117]">Activo</span>
                              </div>
                            </div>
                          </>
                        )}
                        {activeFeature === 6 && (
                          <>
                            <div className="h-32 bg-slate-50 rounded p-3 mb-3">
                              <div className="flex items-end justify-between h-full gap-2">
                                <div className="flex-1 bg-[#0D1117] rounded-t" style={{height: '40%'}}></div>
                                <div className="flex-1 bg-[#0D1117] rounded-t" style={{height: '65%'}}></div>
                                <div className="flex-1 bg-[#0D1117] rounded-t" style={{height: '50%'}}></div>
                                <div className="flex-1 bg-[#0D1117] rounded-t" style={{height: '80%'}}></div>
                                <div className="flex-1 bg-[#0D1117] rounded-t" style={{height: '70%'}}></div>
                              </div>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-600">Ingresos del Mes</span>
                              <span className="font-semibold text-[#0D1117]">+23%</span>
                            </div>
                          </>
                        )}
                        {activeFeature === 7 && (
                          <>
                            <div className="border rounded-lg p-3 mb-3">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-semibold text-sm">Ticket #1234</span>
                                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">En Progreso</span>
                              </div>
                              <p className="text-xs text-slate-600 mb-2">iPhone 14 Pro - Cambio de pantalla</p>
                              <div className="w-full bg-slate-200 rounded-full h-2">
                                <div className="bg-[#0D1117] h-2 rounded-full" style={{width: '60%'}}></div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <div className="flex-1 bg-slate-100 rounded p-2 text-center">
                                <p className="text-lg font-bold text-[#0D1117]">45</p>
                                <p className="text-xs text-slate-500">Abiertos</p>
                              </div>
                              <div className="flex-1 bg-slate-100 rounded p-2 text-center">
                                <p className="text-lg font-bold text-[#0D1117]">128</p>
                                <p className="text-xs text-slate-500">Completados</p>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Right - Text Content */}
              <div className="order-1 lg:order-2">
                <h3 className="font-serif text-3xl font-bold text-slate-900 mb-4">
                  {features[activeFeature].title}
                </h3>
                <p className="text-slate-600 text-base leading-relaxed mb-6">
                  {features[activeFeature].description}
                </p>
                <Link href="/checkout?plan=basico&cycle=mensual">
                  <Button className="bg-[#0D1117] text-white hover:bg-[#0f3d3a] rounded-md px-6 h-11 text-sm">
                    Comenzar
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ecosistema de Comunicación Unificada - Carrusel Horizontal */}
      <section className="py-20 bg-white overflow-hidden">
        {/* Title Section */}
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 mb-12">
          <div className="text-center">
            <h2 className="font-serif text-4xl font-bold text-slate-900 mb-4">
              Ecosistema de Comunicación Unificada
            </h2>
            <p className="text-base text-slate-600 max-w-3xl mx-auto">
              Un ecosistema de comunicación unificada integrado con <JcOneFixMark tone="onLight" className="font-semibold" />{' '}
              para gestionar todas tus llamadas, emails y mensajes en un solo lugar.
            </p>
          </div>
        </div>

        {/* Carrusel Horizontal Automático */}
        <div className="relative">
          <div className="flex animate-slide-cards">
            
            {/* Primera tanda de cards */}
            <div className="flex gap-6 px-3 shrink-0">
              
              {/* 1. Sistema de Teléfono - Fondo Azul - MEJORADO */}
              <div className="w-[600px] h-[450px] bg-[#dbeafe] rounded-3xl p-8 shrink-0 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Phone className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-slate-800">Sistema de Teléfono</span>
                    <p className="text-xs text-slate-500">
                      Desarrollado por <JcOneFixMark tone="onLight" />
                    </p>
                  </div>
                </div>
                <h3 className="font-serif text-3xl font-bold text-slate-900 mb-3">
                  Sistema de Teléfono Integrado
                </h3>
                <p className="text-slate-700 text-base mb-4 max-w-sm">
                  Captura las llamadas de clientes dentro de tu POS con un solo número de negocio.
                </p>
                <Button className="bg-[#0D1117] text-white hover:bg-[#0f3d3a] rounded-full px-6 h-11 text-sm font-semibold flex items-center gap-2">
                  Comenzar <span>→</span>
                </Button>
                
                {/* Visual Elements - Mockup mejorado */}
                <div className="absolute bottom-6 right-6 w-56">
                  <div className="bg-white rounded-xl shadow-2xl p-3 border border-slate-100">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-[#0D1117]"></div>
                      <span className="ml-2 text-xs text-slate-400">Phone System</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="bg-[#0D1117] text-white p-3 rounded-lg text-center">
                        <Phone className="w-5 h-5 mx-auto mb-1" />
                        <span className="text-xs">Llamar</span>
                      </div>
                      <div className="bg-slate-100 p-3 rounded-lg text-center text-slate-600">
                        <MessageSquare className="w-5 h-5 mx-auto mb-1" />
                        <span className="text-xs">SMS</span>
                      </div>
                      <div className="bg-slate-100 p-3 rounded-lg text-center text-slate-600">
                        <Clock className="w-5 h-5 mx-auto mb-1" />
                        <span className="text-xs">Logs</span>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2 text-center">
                      <p className="text-sm font-semibold text-[#0D1117]">+34 900 123 456</p>
                    </div>
                  </div>
                </div>
                
                {/* Badges flotantes */}
                <div className="absolute top-28 right-4 bg-[#0D1117] text-white px-3 py-1.5 rounded-full text-xs shadow-lg font-medium">
                  Grabaciones y transcripciones
                </div>
                <div className="absolute bottom-28 left-4 bg-[#0D1117] text-white px-3 py-1.5 rounded-full text-xs shadow-lg font-medium">
                  Alertas con ticket info
                </div>
                <div className="absolute bottom-14 left-32 bg-[#0D1117] text-white px-3 py-1.5 rounded-full text-xs shadow-lg font-medium">
                  IVR personalizado
                </div>
                
                {/* Icono de teléfono flotante */}
                <div className="absolute bottom-4 left-4 w-12 h-12 bg-slate-800 rounded-xl shadow-lg flex items-center justify-center">
                  <Phone className="w-6 h-6 text-white" />
                </div>
              </div>

              {/* 2. Bandeja Multicanal - Fondo Lila - MEJORADO */}
              <div className="w-[600px] h-[450px] bg-[#e9d5ff] rounded-3xl p-8 shrink-0 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-slate-800">Conectar</span>
                    <p className="text-xs text-slate-500">
                      Por <JcOneFixMark tone="onLight" />
                    </p>
                  </div>
                </div>
                <h3 className="font-serif text-3xl font-bold text-slate-900 mb-3">
                  Bandeja Multicanal
                </h3>
                <p className="text-slate-700 text-base mb-4 max-w-sm">
                  Gmail, WhatsApp, Facebook y más en una sola bandeja unificada.
                </p>
                <Button className="bg-[#0D1117] text-white hover:bg-[#0f3d3a] rounded-full px-6 h-11 text-sm font-semibold flex items-center gap-2">
                  Comenzar <span>→</span>
                </Button>
                
                {/* Visual - Inbox Mockup */}
                <div className="absolute bottom-6 right-6 w-60">
                  <div className="bg-white rounded-xl shadow-2xl p-3 border border-slate-100">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                      <MessageCircle className="w-4 h-4 text-purple-500" />
                      <span className="text-xs font-semibold text-slate-700">Bandeja Unificada</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-2 bg-red-50 rounded-lg border border-red-100">
                        <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">G</div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-slate-700">Gmail</p>
                          <p className="text-xs text-slate-500">Nuevo mensaje...</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">f</div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-slate-700">Facebook</p>
                          <p className="text-xs text-slate-500">Consulta...</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-2 bg-[#0D1117]/10 rounded-lg border border-[#0D1117]/20">
                        <div className="w-8 h-8 bg-[#0D1117] rounded-full flex items-center justify-center text-white text-xs font-bold">W</div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-slate-700">WhatsApp</p>
                          <p className="text-xs text-slate-500">Confirmación...</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Badges */}
                <div className="absolute top-28 right-4 bg-purple-600 text-white px-3 py-1.5 rounded-full text-xs shadow-lg font-medium">
                  Reseñas con IA
                </div>
                <div className="absolute bottom-28 left-4 bg-purple-600 text-white px-3 py-1.5 rounded-full text-xs shadow-lg font-medium">
                  Sincroniza emails
                </div>
                <div className="absolute bottom-14 left-32 bg-purple-600 text-white px-3 py-1.5 rounded-full text-xs shadow-lg font-medium">
                  Chat SMS
                </div>
                
                {/* Icono flotante */}
                <div className="absolute bottom-4 left-4 w-12 h-12 bg-purple-500 rounded-xl shadow-lg flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
              </div>

              {/* 3. Programación de Citas - Fondo Beige - MEJORADO */}
              <div className="w-[600px] h-[450px] bg-[#fef3c7] rounded-3xl p-8 shrink-0 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-slate-800">Citas Pro</span>
                    <p className="text-xs text-slate-500">
                      Por <JcOneFixMark tone="onLight" />
                    </p>
                  </div>
                </div>
                <h3 className="font-serif text-3xl font-bold text-slate-900 mb-3">
                  Programación de Citas
                </h3>
                <p className="text-slate-700 text-base mb-4 max-w-sm">
                  Convierte visitantes en trabajos reservados con widget de citas personalizado.
                </p>
                <Button className="bg-[#0D1117] text-white hover:bg-[#0f3d3a] rounded-full px-6 h-11 text-sm font-semibold flex items-center gap-2">
                  Comenzar <span>→</span>
                </Button>
                
                {/* Visual - Calendar Mockup */}
                <div className="absolute bottom-6 right-6 w-56">
                  <div className="bg-white rounded-xl shadow-2xl p-3 border border-slate-100">
                    <div className="bg-[#0D1117] text-white px-3 py-2 rounded-lg mb-3 text-center text-sm font-semibold">
                      Cita de Reparación
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
                      {['L','M','X','J','V','S','D'].map((d, i) => (
                        <div key={i} className="text-slate-500 font-medium">{d}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs mb-3">
                      {[...Array(14)].map((_, i) => (
                        <div key={i} className={`p-1.5 rounded ${i === 10 ? 'bg-amber-500 text-white font-bold' : 'hover:bg-slate-100'}`}>
                          {i + 1}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 justify-center">
                      <span className="bg-[#0D1117] text-white px-3 py-1 rounded-full text-xs">09:00</span>
                      <span className="bg-[#0D1117] text-white px-3 py-1 rounded-full text-xs">10:30</span>
                    </div>
                  </div>
                </div>
                
                {/* Badges */}
                <div className="absolute top-28 right-4 bg-amber-500 text-white px-3 py-1.5 rounded-full text-xs shadow-lg font-medium">
                  Multi-locación
                </div>
                <div className="absolute bottom-28 left-4 bg-amber-500 text-white px-3 py-1.5 rounded-full text-xs shadow-lg font-medium">
                  Cotizaciones automáticas
                </div>
                <div className="absolute bottom-14 left-36 bg-amber-500 text-white px-3 py-1.5 rounded-full text-xs shadow-lg font-medium">
                  Optimizado móvil
                </div>
                
                {/* Icono flotante */}
                <div className="absolute bottom-4 left-4 w-12 h-12 bg-amber-500 rounded-xl shadow-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
              </div>

              {/* 4. ARIA IA - Fondo Cyan - MEJORADO */}
              <div className="w-[600px] h-[450px] bg-[#cffafe] rounded-3xl p-8 shrink-0 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-cyan-600 rounded-lg flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-slate-800">ARIA</span>
                    <p className="text-xs text-slate-500">
                      Por <JcOneFixMark tone="onLight" />
                    </p>
                  </div>
                </div>
                <h3 className="font-serif text-3xl font-bold text-slate-900 mb-3">
                  Recepcionista de IA
                </h3>
                <p className="text-slate-700 text-base mb-4 max-w-sm">
                  Asistente de IA que nunca pierde una llamada. Cotizaciones y respuestas 24/7.
                </p>
                <Button className="bg-[#0D1117] text-white hover:bg-[#0f3d3a] rounded-full px-6 h-11 text-sm font-semibold flex items-center gap-2">
                  Comenzar <span>→</span>
                </Button>
                
                {/* Visual - AI Waveform */}
                <div className="absolute bottom-8 right-8">
                  <div className="w-44 h-24 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl">
                    <div className="flex items-center gap-1.5">
                      {[...Array(10)].map((_, i) => (
                        <div key={i} className="w-1.5 bg-white rounded-full animate-pulse" style={{height: `${12 + Math.random() * 40}px`, animationDelay: `${i * 0.1}s`}}></div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Ticket Card flotante */}
                <div className="absolute bottom-6 right-52 bg-white rounded-xl shadow-xl p-3 border border-slate-100">
                  <p className="text-xs text-slate-500 mb-1">Ticket #1234</p>
                  <p className="text-lg font-bold text-[#0D1117]">$129.49</p>
                  <p className="text-xs text-[#0D1117] flex items-center gap-1">
                    <span className="w-2 h-2 bg-[#0D1117] rounded-full"></span>
                    Cotización enviada
                  </p>
                </div>
                
                {/* Badges */}
                <div className="absolute top-28 right-4 bg-cyan-600 text-white px-3 py-1.5 rounded-full text-xs shadow-lg font-medium">
                  Disponible 24/7
                </div>
                <div className="absolute bottom-32 left-4 bg-cyan-600 text-white px-3 py-1.5 rounded-full text-xs shadow-lg font-medium">
                  Responde preguntas
                </div>
                <div className="absolute bottom-16 left-36 bg-cyan-600 text-white px-3 py-1.5 rounded-full text-xs shadow-lg font-medium">
                  Recordatorios SMS
                </div>
                
                {/* Icono flotante */}
                <div className="absolute bottom-4 left-4 w-12 h-12 bg-cyan-600 rounded-xl shadow-lg flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                
                {/* Avatar decorativo */}
                <div className="absolute top-20 right-40 w-8 h-8 bg-slate-300 rounded-full border-2 border-white shadow-lg"></div>
              </div>

            </div>

            {/* Segunda tanda duplicada para efecto infinito */}
            <div className="flex gap-6 px-3 shrink-0">
              
              {/* 1. Sistema de Teléfono - Fondo Azul */}
              <div className="w-[600px] h-[450px] bg-[#dbeafe] rounded-3xl p-8 shrink-0 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Phone className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-slate-800">Sistema de Teléfono</span>
                    <p className="text-xs text-slate-500">
                      Desarrollado por <JcOneFixMark tone="onLight" />
                    </p>
                  </div>
                </div>
                <h3 className="font-serif text-3xl font-bold text-slate-900 mb-3">
                  Sistema de Teléfono Integrado
                </h3>
                <p className="text-slate-700 text-base mb-4 max-w-md">
                  Captura las llamadas de clientes dentro de tu POS con un solo número de negocio para llamadas y mensajes de texto.
                </p>
                <Button className="bg-[#0D1117] text-white hover:bg-[#0f3d3a] rounded-full px-6 h-11 text-sm font-semibold flex items-center gap-2">
                  Comenzar <span>→</span>
                </Button>
                
                {/* Visual Elements */}
                <div className="absolute bottom-8 right-8 w-48">
                  <div className="bg-white rounded-xl shadow-xl p-3 mb-3">
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b">
                      <div className="w-2 h-2 rounded-full bg-red-400"></div>
                      <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                      <div className="w-2 h-2 rounded-full bg-[#0D1117]"></div>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <div className="bg-[#0D1117] text-white p-2 rounded text-center text-xs">
                        <Phone className="w-4 h-4 mx-auto mb-1" />
                      </div>
                      <div className="bg-slate-100 p-2 rounded text-center text-xs text-slate-600">
                        <MessageSquare className="w-4 h-4 mx-auto" />
                      </div>
                      <div className="bg-slate-100 p-2 rounded text-center text-xs text-slate-600">
                        <Clock className="w-4 h-4 mx-auto" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-24 left-8 bg-[#0D1117] text-white px-3 py-1 rounded-full text-xs shadow-lg">
                  Alertas de llamadas con ticket
                </div>
                <div className="absolute bottom-8 left-32 bg-[#0D1117] text-white px-3 py-1 rounded-full text-xs shadow-lg">
                  IVR personalizado
                </div>
                <div className="absolute top-24 right-8 bg-[#0D1117] text-white px-3 py-1 rounded-full text-xs shadow-lg">
                  Grabaciones y transcripciones
                </div>
              </div>

              {/* 2. Bandeja Multicanal - Fondo Lila */}
              <div className="w-[600px] h-[450px] bg-[#e9d5ff] rounded-3xl p-8 shrink-0 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-slate-800">Conectar</span>
                    <p className="text-xs text-slate-500">
                      Por <JcOneFixMark tone="onLight" />
                    </p>
                  </div>
                </div>
                <h3 className="font-serif text-3xl font-bold text-slate-900 mb-3">
                  Bandeja Multicanal
                </h3>
                <p className="text-slate-700 text-base mb-4 max-w-md">
                  Gestiona todos los mensajes de clientes en una bandeja de entrada unificada que te evita cambiar entre pestañas.
                </p>
                <Button className="bg-[#0D1117] text-white hover:bg-[#0f3d3a] rounded-full px-6 h-11 text-sm font-semibold flex items-center gap-2">
                  Comenzar <span>→</span>
                </Button>
                
                {/* Visual Elements */}
                <div className="absolute bottom-8 right-8 w-52">
                  <div className="bg-white rounded-xl shadow-xl p-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                        <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">G</div>
                        <span className="text-sm">Gmail</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">f</div>
                        <span className="text-sm">Facebook</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                        <div className="w-8 h-8 bg-[#0D1117] rounded-full flex items-center justify-center text-white text-xs font-bold">W</div>
                        <span className="text-sm">WhatsApp</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-20 left-8 bg-purple-600 text-white px-3 py-1 rounded-full text-xs shadow-lg">
                  Sincroniza emails
                </div>
                <div className="absolute bottom-8 left-32 bg-purple-600 text-white px-3 py-1 rounded-full text-xs shadow-lg">
                  Chat SMS
                </div>
                <div className="absolute top-24 right-8 bg-purple-600 text-white px-3 py-1 rounded-full text-xs shadow-lg">
                  Reseñas Google con IA
                </div>
              </div>

              {/* 3. Programación de Citas - Fondo Beige */}
              <div className="w-[600px] h-[450px] bg-[#fef3c7] rounded-3xl p-8 shrink-0 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-slate-800">Citas Pro</span>
                    <p className="text-xs text-slate-500">
                      Por <JcOneFixMark tone="onLight" />
                    </p>
                  </div>
                </div>
                <h3 className="font-serif text-3xl font-bold text-slate-900 mb-3">
                  Programación de Citas
                </h3>
                <p className="text-slate-700 text-base mb-4 max-w-md">
                  Convierte visitantes de tu sitio web en trabajos de reparación reservados con un widget personalizado.
                </p>
                <Button className="bg-[#0D1117] text-white hover:bg-[#0f3d3a] rounded-full px-6 h-11 text-sm font-semibold flex items-center gap-2">
                  Comenzar <span>→</span>
                </Button>
                
                {/* Visual Elements */}
                <div className="absolute bottom-8 right-8 w-48">
                  <div className="bg-white rounded-xl shadow-xl p-3">
                    <div className="bg-[#0D1117] text-white px-3 py-2 rounded mb-2 text-center text-sm">
                      Cita de Reparación
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
                      {['L','M','X','J','V','S','D'].map((d, i) => (
                        <div key={i} className="text-slate-500">{d}</div>
                      ))}
                    </div>
                    <div className="bg-amber-500 text-white text-xs p-2 rounded text-center">
                      15 - 10:00 AM
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-24 left-8 bg-amber-500 text-white px-3 py-1 rounded-full text-xs shadow-lg">
                  Multi-locación
                </div>
                <div className="absolute bottom-8 left-32 bg-amber-500 text-white px-3 py-1 rounded-full text-xs shadow-lg">
                  Cotizaciones automáticas
                </div>
                <div className="absolute top-24 right-8 bg-amber-500 text-white px-3 py-1 rounded-full text-xs shadow-lg">
                  Optimizado para móvil
                </div>
              </div>

              {/* 4. ARIA IA - Fondo Cyan */}
              <div className="w-[600px] h-[450px] bg-[#cffafe] rounded-3xl p-8 shrink-0 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-cyan-600 rounded-lg flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-slate-800">ARIA</span>
                    <p className="text-xs text-slate-500">
                      Por <JcOneFixMark tone="onLight" />
                    </p>
                  </div>
                </div>
                <h3 className="font-serif text-3xl font-bold text-slate-900 mb-3">
                  Recepcionista de IA
                </h3>
                <p className="text-slate-700 text-base mb-4 max-w-md">
                  Reemplaza las llamadas perdidas y reserva más reparaciones con un asistente de IA que nunca pierde una oportunidad.
                </p>
                <Button className="bg-[#0D1117] text-white hover:bg-[#0f3d3a] rounded-full px-6 h-11 text-sm font-semibold flex items-center gap-2">
                  Comenzar <span>→</span>
                </Button>
                
                {/* Visual Elements */}
                <div className="absolute bottom-16 right-12">
                  <div className="w-40 h-20 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-xl">
                    <div className="flex items-center gap-1">
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="w-1 bg-white rounded-full" style={{height: `${15 + Math.random() * 30}px`}}></div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-8 right-48 bg-white rounded-lg shadow-lg p-2">
                  <p className="text-xs text-slate-500">Ticket #1234</p>
                  <p className="text-sm font-bold text-[#0D1117]">$129.49</p>
                </div>
                <div className="absolute bottom-24 left-8 bg-cyan-600 text-white px-3 py-1 rounded-full text-xs shadow-lg">
                  Responde preguntas 24/7
                </div>
                <div className="absolute bottom-8 left-40 bg-cyan-600 text-white px-3 py-1 rounded-full text-xs shadow-lg">
                  Recordatorios SMS
                </div>
                <div className="absolute top-24 right-8 bg-cyan-600 text-white px-3 py-1 rounded-full text-xs shadow-lg">
                  Cotizaciones instantáneas
                </div>
                <div className="absolute bottom-32 right-8">
                  <Calendar className="w-8 h-8 text-cyan-600" />
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Awards */}
        <div className="pt-16 bg-white">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
            <div className="flex flex-wrap justify-center items-center gap-4">
              {['Happiest Users', 'GetApp Leader', 'Software Advice', 'Capterra 240+', 'Quality Choice', 'Trustpilot 400+'].map((badge, i) => (
                <div key={i} className="bg-[#0D1117] text-white rounded-full px-4 py-2 text-xs font-semibold shadow-md">
                  {badge}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Industries - Ancho completo */}
      <section id="industries" className="py-20 bg-[#faf9f6]">
        <div className="max-w-[1800px] mx-auto px-4 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-serif text-4xl font-bold text-slate-900 mb-3">
              Industrias que Servimos
            </h2>
            <p className="text-base text-slate-600 max-w-2xl mx-auto">
              <JcOneFixMark tone="onLight" className="font-semibold" /> ofrece control total de reparaciones con un flujo
              de trabajo integral.
            </p>
          </div>

          {/* Grid estático de industrias - 7 cards usando todo el ancho */}
          <div className="flex gap-4 w-full">
            {[
              { name: 'Móviles', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&q=80', desc: 'Smartphones y tablets' },
              { name: 'Ordenadores', image: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=500&q=80', desc: 'Laptops y desktops' },
              { name: 'TV', image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500&q=80', desc: 'LED, OLED, Smart TV' },
              { name: 'Drones', image: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=500&q=80', desc: 'Equipos aéreos' },
              { name: 'Consolas', image: 'https://images.unsplash.com/photo-1605901309584-818e25960a8f?w=500&q=80', desc: 'PS, Xbox, Switch' },
              { name: 'Electrodomésticos', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&q=80', desc: 'Línea blanca' },
              { name: 'Audio', image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=500&q=80', desc: 'Auriculares, altavoces' },
            ].map((industry, i) => (
              <div key={i} className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer flex-1 min-w-0">
                <div className="h-52 overflow-hidden">
                  <img src={industry.image} alt={industry.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-slate-900 text-base mb-1 truncate">{industry.name}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{industry.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-[#0D1117]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white mb-6">
                Comienza con el POS #1 para Talleres de Reparación
              </h2>
              <Link href="/checkout?plan=basico&cycle=mensual">
                <Button className="bg-[#F5C518] text-[#0D1117] hover:bg-[#D4A915] font-semibold rounded-md px-6 h-11 text-sm border-0">
                  Comenzar Prueba Gratis
                </Button>
              </Link>
            </div>
            <div className="hidden lg:flex justify-end">
              <div className="relative w-[300px] h-[300px]">
                <div className="absolute inset-0 bg-[#0D1117] rounded-full overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=90" 
                    alt="Mujer sonriente"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer data-web-chrome className="py-16 bg-white border-t border-slate-200">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="grid md:grid-cols-5 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <JcOneFixAppIcon className="rounded-lg p-1.5 h-9 w-9" />
                <JcOneFixMark tone="onLight" className="text-lg font-bold" />
              </div>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Software de gestión todo-en-uno para talleres de reparación.
              </p>
              <div className="flex gap-3">
                {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
                  <a key={i} href="#" className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center hover:bg-[#0D1117] hover:text-white transition-colors text-slate-600">
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-4 text-sm">Producto</h4>
              <ul className="space-y-2 text-xs text-slate-600">
                {['Características', 'Precios', 'Integraciones', 'API'].map((item) => (
                  <li key={item}><Link href="#" className="hover:text-[#0D1117] transition-colors">{item}</Link></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-4 text-sm">Compañía</h4>
              <ul className="space-y-2 text-xs text-slate-600">
                {['Sobre Nosotros', 'Blog', 'Partners'].map((item) => (
                  <li key={item}><Link href="#" className="hover:text-[#0D1117] transition-colors">{item}</Link></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-4 text-sm">Soporte</h4>
              <ul className="space-y-2 text-xs text-slate-600">
                {['Centro de Ayuda', 'Documentación'].map((item) => (
                  <li key={item}><Link href="#" className="hover:text-[#0D1117] transition-colors">{item}</Link></li>
                ))}
                <li>
                  <a
                    href={`mailto:${NOTIFICATIONS_INBOX_EMAIL}`}
                    className="hover:text-[#0D1117] transition-colors"
                  >
                    {NOTIFICATIONS_INBOX_EMAIL}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 flex flex-col md:flex-row justify-between items-center gap-3">
            <p className="text-xs text-slate-500 flex flex-wrap items-center gap-1 justify-center md:justify-start">
              2026 <JcOneFixMark tone="onLight" />. Todos los derechos reservados.
            </p>
            <div className="flex gap-6 text-xs text-slate-500">
              <Link href="/privacidad" className="hover:text-slate-900 transition-colors">Política de Privacidad</Link>
              <Link href="/terminos" className="hover:text-slate-900 transition-colors">Términos de Servicio</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

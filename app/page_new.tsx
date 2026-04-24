import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  ArrowRight, Star, Building2, Facebook, Twitter, Instagram, Linkedin, 
  Smartphone, Laptop, Package, CreditCard, Calendar, Monitor, MessageSquare, 
  Users, BarChart3, FileText, Bot, Phone, Camera, Gem, Clock
} from 'lucide-react';
import Link from 'next/link';
import { JcOneFixMark, JcOneFixAppIcon, JcOneFixWrenchGlyph } from '@/components/jc-one-fix-mark';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section - Estilo Premium JC ONE FIX */}
      <section className="relative min-h-screen bg-[#0D1117] overflow-hidden flex flex-col">
        <nav className="relative z-50 w-full">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
            <div className="flex justify-between items-center h-24">
              <div className="flex items-center gap-3">
                <div className="bg-white/10 p-2.5 rounded-xl border border-white/10 inline-flex items-center justify-center">
                  <JcOneFixWrenchGlyph variant="onDark" className="h-6 w-6" />
                </div>
                <JcOneFixMark tone="onDark" className="text-2xl font-bold tracking-tight" />
              </div>
              <div className="hidden md:flex items-center gap-10">
                <Link href="#features" className="text-sm font-medium text-white/80 hover:text-white transition-colors">Características</Link>
                <Link href="#pricing" className="text-sm font-medium text-white/80 hover:text-white transition-colors">Precios</Link>
              </div>
              <div className="flex items-center gap-6">
                <Link href="/login" className="text-sm font-semibold text-white hover:text-white/80">Log in</Link>
                <Link href="/checkout?plan=basico&cycle=mensual">
                  <Button className="bg-[#F5C518] text-[#0D1117] hover:bg-[#D4A915] font-bold rounded-full px-8 h-12">
                    Prueba Gratis
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <div className="flex-1 flex items-center relative z-10">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-12 w-full py-12">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="max-w-2xl">
                <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-8 leading-[1.1] tracking-tight">
                  Software de Gestión de <br />
                  <span className="text-[#F5C518]">Talleres</span> Todo-en-Uno
                </h1>
                <p className="text-xl text-white/90 mb-10 leading-relaxed max-w-xl">
                  El software #1 basado en la nube para puntos de venta de talleres de reparación y comunicación unificada para hacer crecer tu negocio.
                </p>
                <div className="flex flex-col sm:flex-row gap-5 mb-10">
                  <Link href="/checkout?plan=basico&cycle=mensual">
                    <Button size="lg" className="bg-[#F5C518] text-[#0D1117] hover:bg-[#D4A915] text-lg px-10 py-7 font-bold rounded-full shadow-xl">
                      Empezar Prueba Gratis
                    </Button>
                  </Link>
                  <Button size="lg" variant="outline" className="border-2 border-white/50 text-white hover:bg-white/10 text-lg px-10 py-7 rounded-full bg-transparent">
                    Ver Precios
                  </Button>
                </div>
                <p className="text-white/60 text-sm italic">
                  Prueba gratuita de 14 días • Sin tarjeta de crédito • Soporte en español
                </p>
              </div>

              <div className="relative hidden lg:block">
                <div className="relative w-[550px] h-[600px] ml-auto">
                  <div className="absolute inset-0 bg-[#F5C518] rounded-[40px] shadow-2xl rotate-2" />
                  <div className="absolute inset-0 rounded-[40px] overflow-hidden -rotate-2">
                    <img 
                      src="https://images.unsplash.com/photo-1556157382-97eda2d62296?w=900&q=90" 
                      alt="Técnico JC ONE FIX"
                      className="w-full h-full object-cover scale-110"
                    />
                  </div>
                  <div className="absolute -right-8 top-16 w-80 bg-white rounded-2xl shadow-2xl overflow-hidden z-20 border border-slate-100">
                    <div className="bg-slate-100 px-4 py-2.5 flex items-center gap-2 border-b">
                      <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-400" /><div className="w-2.5 h-2.5 rounded-full bg-yellow-400" /><div className="w-2.5 h-2.5 rounded-full bg-[#F5C518]" /></div>
                    </div>
                    <div className="p-5">
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {[{ label: 'NUEVOS', val: '89' }, { label: 'PEND.', val: '15' }, { label: 'VENTAS', val: '€58K' }].map((s, i) => (
                          <div key={i} className="bg-[#0D1117] rounded-lg p-2 text-white text-center">
                            <p className="text-[8px] opacity-70 tracking-tighter">{s.label}</p>
                            <p className="text-xs font-bold">{s.val}</p>
                          </div>
                        ))}
                      </div>
                      <div className="h-16 flex items-end gap-1">
                        {[30, 50, 40, 80, 45, 60].map((h, i) => (
                          <div key={i} className="flex-1 bg-[#0D1117]/20 rounded-t-sm" style={{ height: `${h}%` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="absolute -top-6 right-24 w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center shadow-xl z-30 transform rotate-12">
                    <JcOneFixWrenchGlyph variant="onDark" className="w-8 h-8" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Características Section */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-bold text-slate-900 mb-4">Características de Elite</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">Todo lo que necesitas para gestionar tu taller en un solo lugar.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Package, title: 'Gestión de Inventario', desc: 'Control de stock en tiempo real.' },
              { icon: CreditCard, title: 'Pagos Integrados', desc: 'Procesamiento seguro y rápido.' },
              { icon: Calendar, title: 'Citas Online', desc: 'Sistema de reserva para clientes.' },
              { icon: FileText, title: 'Gestión de Tickets', desc: 'Sistema completo de reparaciones.' },
            ].map((feature, i) => (
              <Card key={i} className="border-0 shadow-lg hover:shadow-xl transition-all">
                <CardHeader>
                  <div className="w-12 h-12 bg-[#0D1117]/10 rounded-xl flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-[#0D1117]" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription>{feature.desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <JcOneFixAppIcon className="rounded-lg" />
              <JcOneFixMark tone="onDark" className="text-xl font-bold tracking-tight" />
            </div>
            <p className="text-sm flex flex-wrap items-center gap-1 justify-center">
              © {new Date().getFullYear()} <JcOneFixMark tone="onDark" />. Todos los derechos reservados.
            </p>
            <div className="flex gap-4">
              {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
                <Icon key={i} className="h-5 w-5 hover:text-white cursor-pointer transition-colors" />
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

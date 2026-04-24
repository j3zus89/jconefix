import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { JcOneFixMark, JcOneFixWrenchGlyph } from '@/components/jc-one-fix-mark';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section - Estilo Premium JC ONE FIX */}
      <section className="relative min-h-screen bg-[#0D1117] overflow-hidden flex flex-col">
        {/* Navbar */}
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

        {/* Hero Content */}
        <div className="flex-1 flex items-center relative z-10">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-12 w-full py-12">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Lado Izquierdo: Textos */}
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

              {/* Lado Derecho: Imagen y Mockups */}
              <div className="relative hidden lg:block">
                <div className="relative w-[550px] h-[600px] ml-auto">
                  {/* Fondo decorativo */}
                  <div className="absolute inset-0 bg-[#F5C518] rounded-[40px] shadow-2xl rotate-2" />
                  
                  {/* Imagen del técnico profesional */}
                  <div className="absolute inset-0 rounded-[40px] overflow-hidden -rotate-2">
                    <img 
                      src="https://images.unsplash.com/photo-1556157382-97eda2d62296?w=900&q=90" 
                      alt="Técnico JC ONE FIX"
                      className="w-full h-full object-cover scale-110"
                    />
                  </div>

                  {/* Dashboard Mockup flotante */}
                  <div className="absolute -right-8 top-16 w-80 bg-white rounded-2xl shadow-2xl overflow-hidden z-20 border border-slate-100">
                    <div className="bg-slate-100 px-4 py-2.5 flex items-center gap-2 border-b">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                        <div className="w-2.5 h-2.5 rounded-full bg-[#F5C518]" />
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {[
                          { label: 'NUEVOS', val: '89' },
                          { label: 'PEND.', val: '15' },
                          { label: 'VENTAS', val: '€58K' }
                        ].map((s, i) => (
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

                  {/* Iconos flotantes */}
                  <div className="absolute -top-6 right-24 w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center shadow-xl z-30 transform rotate-12">
                    <JcOneFixWrenchGlyph variant="onDark" className="w-8 h-8" />
                  </div>
                  <div className="absolute bottom-20 -left-6 w-14 h-14 bg-orange-500 rounded-xl flex items-center justify-center shadow-xl z-30 transform -rotate-12">
                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2z" /></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const industries = [
  { slug: 'smartphones',    name: 'Smartphones',     image: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=400&q=80', desc: 'iPhone, Android, BGA' },
  { slug: 'tablets',        name: 'Tablets',          image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=400&q=80', desc: 'iPad, glass, placa' },
  { slug: 'tv',             name: 'TV y monitores',   image: 'https://images.unsplash.com/photo-1461151304267-38535e780c79?auto=format&fit=crop&w=400&q=80', desc: 'LED, OLED, smart TV' },
  { slug: 'drones',         name: 'Drones',           image: 'https://images.unsplash.com/photo-1521405924368-64c5b84bec60?auto=format&fit=crop&w=400&q=80', desc: 'ESC, motores, gimbal' },
  { slug: 'audio',          name: 'Audio / Hi-Fi',    image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=400&q=80', desc: 'Auriculares, altavoces' },
  { slug: 'consolas',       name: 'Consolas',         image: 'https://images.unsplash.com/photo-1605901309584-818e25960a8f?auto=format&fit=crop&w=400&q=80', desc: 'PS, Xbox, Switch' },
  { slug: 'micro',          name: 'Microelectrónica', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80', desc: 'Soldadura, boards' },
  { slug: 'wearables',      name: 'Wearables',        image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&w=400&q=80', desc: 'Relojes, conectados' },
];

const SectionHeader = ({ num, title, desc }: { num: number; title: string; desc: string }) => (
  <div className="mb-6 flex items-start gap-4">
    <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5C518]/10 border border-[#F5C518]/30">
      <span className="font-mono text-sm font-black text-[#F5C518]">{num}</span>
    </div>
    <div>
      <h2 className="text-base font-bold text-white">{title}</h2>
      <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
    </div>
  </div>
);

/* ── VARIANTE 1: Círculos con foto, fila centrada ── */
function V1() {
  return (
    <div className="text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#F5C518] mb-1">Sectores</p>
      <h3 className="font-serif text-2xl font-bold text-white mb-8">Industrias que servimos</h3>
      <div className="flex flex-wrap justify-center gap-6">
        {industries.map(ind => (
          <div key={ind.slug} className="flex flex-col items-center gap-2 group cursor-pointer">
            <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-[#F5C518]/60 transition-all duration-300">
              <img src={ind.image} alt={ind.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />
            </div>
            <span className="text-[11px] text-slate-400 group-hover:text-white transition-colors font-medium">{ind.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── VARIANTE 2: Círculos pequeños con borde lima, sin foto ── */
function V2() {
  const emojis: Record<string,string> = { smartphones:'📱', tablets:'📲', tv:'📺', drones:'🚁', audio:'🎧', consolas:'🎮', micro:'🔬', wearables:'⌚' };
  return (
    <div>
      <div className="flex items-baseline justify-between mb-6">
        <h3 className="font-serif text-xl font-bold text-white">Industrias</h3>
        <span className="text-[10px] text-slate-500 uppercase tracking-widest">8 verticales</span>
      </div>
      <div className="flex flex-wrap gap-4">
        {industries.map(ind => (
          <div key={ind.slug} className="flex flex-col items-center gap-1.5 group cursor-pointer w-16">
            <div className="h-14 w-14 rounded-full border border-[#F5C518]/30 bg-[#F5C518]/5 flex items-center justify-center group-hover:border-[#F5C518] group-hover:bg-[#F5C518]/10 transition-all duration-200">
              <span className="text-xl">{emojis[ind.slug]}</span>
            </div>
            <span className="text-[10px] text-slate-500 group-hover:text-[#F5C518] text-center leading-tight transition-colors">{ind.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── VARIANTE 3: Fila horizontal con círculos y línea separadora ── */
function V3() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="h-px flex-1 bg-white/8" />
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">Industrias</span>
        <div className="h-px flex-1 bg-white/8" />
      </div>
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
        {industries.map((ind, i) => (
          <div key={ind.slug} className="flex flex-col items-center gap-2 min-w-[60px] group cursor-pointer">
            <div className="relative h-12 w-12 rounded-full overflow-hidden ring-1 ring-white/10 group-hover:ring-[#F5C518]/50 transition-all">
              <img src={ind.image} alt="" className="h-full w-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-[9px] text-slate-500 group-hover:text-slate-300 text-center font-medium transition-colors">{ind.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── VARIANTE 4: Dos filas, círculos medianos, nombre en hover ── */
function V4() {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#F5C518] mb-1">Sectores que cubrimos</p>
      <h3 className="font-serif text-xl font-bold text-white mb-6">8 verticales de reparación</h3>
      <div className="grid grid-cols-4 gap-3">
        {industries.map(ind => (
          <div key={ind.slug} className="group flex flex-col items-center gap-2 cursor-pointer">
            <div className="relative h-14 w-14 rounded-full overflow-hidden">
              <img src={ind.image} alt="" className="h-full w-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 transition-colors rounded-full" />
            </div>
            <span className="text-[10px] text-slate-500 group-hover:text-white transition-colors text-center">{ind.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── VARIANTE 5: Lista horizontal compacta con mini-avatares ── */
function V5() {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <span className="text-xs text-slate-500 font-medium shrink-0">Para talleres de:</span>
      <div className="flex items-center gap-2 flex-wrap">
        {industries.map((ind, i) => (
          <div key={ind.slug} className="flex items-center gap-1.5 group cursor-pointer">
            <div className="h-7 w-7 rounded-full overflow-hidden border border-white/10 group-hover:border-[#F5C518]/50 transition-all shrink-0">
              <img src={ind.image} alt="" className="h-full w-full object-cover" />
            </div>
            <span className="text-xs text-slate-400 group-hover:text-white transition-colors">{ind.name}</span>
            {i < industries.length - 1 && <span className="text-white/15 ml-1">·</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── VARIANTE 6: Círculos apilados (overlap) + contador ── */
function V6() {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
      <div className="flex -space-x-3">
        {industries.slice(0,6).map((ind, i) => (
          <div
            key={ind.slug}
            className="h-10 w-10 rounded-full overflow-hidden border-2 border-[#050a12] ring-1 ring-white/10"
            style={{ zIndex: 10 - i }}
          >
            <img src={ind.image} alt="" className="h-full w-full object-cover" />
          </div>
        ))}
        <div className="h-10 w-10 rounded-full bg-[#F5C518]/10 border-2 border-[#050a12] ring-1 ring-[#F5C518]/30 flex items-center justify-center" style={{ zIndex: 4 }}>
          <span className="text-[10px] font-bold text-[#F5C518]">+2</span>
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold text-white">8 sectores soportados</p>
        <p className="text-xs text-slate-500 mt-0.5">Smartphones · Tablets · TV · Consolas · Drones · Audio · Micro · Wearables</p>
      </div>
    </div>
  );
}

/* ── VARIANTE 7: Grid en forma de hexágono / círculos con descripción inline ── */
function V7() {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-5">Industrias</p>
      <div className="space-y-3">
        {[industries.slice(0,4), industries.slice(4)].map((row, ri) => (
          <div key={ri} className="flex gap-3">
            {row.map(ind => (
              <div key={ind.slug} className="flex items-center gap-2.5 group cursor-pointer flex-1 min-w-0">
                <div className="h-9 w-9 shrink-0 rounded-full overflow-hidden border border-white/10 group-hover:border-[#F5C518]/40 transition-all">
                  <img src={ind.image} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{ind.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{ind.desc}</p>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── VARIANTE 8: Círculos con borde degradado y texto por encima ── */
function V8() {
  return (
    <div className="text-center">
      <h3 className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500 mb-6">Industrias que atendemos</h3>
      <div className="flex flex-wrap justify-center gap-5">
        {industries.map(ind => (
          <div key={ind.slug} className="group cursor-pointer flex flex-col items-center gap-2">
            <div className="p-[1.5px] rounded-full bg-gradient-to-br from-[#F5C518]/40 via-transparent to-[#F5C518]/10 group-hover:from-[#F5C518] group-hover:to-[#F5C518]/40 transition-all duration-300">
              <div className="h-14 w-14 rounded-full overflow-hidden bg-[#050a12]">
                <img src={ind.image} alt="" className="h-full w-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <span className="text-[10px] text-slate-500 group-hover:text-[#F5C518] transition-colors font-medium">{ind.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── VARIANTE 9: Minimalista extremo — solo nombres con punto de color ── */
function V9() {
  return (
    <div>
      <div className="flex items-baseline gap-3 mb-5">
        <span className="font-serif text-lg font-bold text-white">Industrias</span>
        <span className="text-[10px] text-slate-600">que cubrimos con el software</span>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        {industries.map(ind => (
          <div key={ind.slug} className="flex items-center gap-2 group cursor-pointer">
            <div className="h-6 w-6 rounded-full overflow-hidden opacity-60 group-hover:opacity-100 transition-opacity shrink-0">
              <img src={ind.image} alt="" className="h-full w-full object-cover" />
            </div>
            <span className="text-sm text-slate-400 group-hover:text-white transition-colors">{ind.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── VARIANTE 10: Círculo grande central + satélites ── */
function V10() {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-8">
      {/* Columna izquierda: texto */}
      <div className="shrink-0 max-w-[180px]">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#F5C518] mb-1">Sectores</p>
        <h3 className="font-serif text-xl font-bold text-white leading-tight">8 industrias, un solo panel</h3>
      </div>
      {/* Círculos */}
      <div className="flex flex-wrap gap-3">
        {industries.map((ind, i) => (
          <div key={ind.slug} className="group cursor-pointer flex flex-col items-center gap-1.5">
            <div className={`rounded-full overflow-hidden border border-white/10 group-hover:border-[#F5C518]/50 transition-all duration-300 ${i === 0 ? 'h-16 w-16' : i < 3 ? 'h-12 w-12' : 'h-10 w-10'}`}>
              <img src={ind.image} alt="" className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />
            </div>
            <span className="text-[9px] text-slate-600 group-hover:text-slate-300 transition-colors text-center">{ind.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const variants = [
  { num: 1,  title: 'Foto + nombre — fila centrada',         desc: 'Círculos medianos con foto a color, etiqueta debajo. Simple y limpio.', Component: V1 },
  { num: 2,  title: 'Emoji + nombre — fila compacta',         desc: 'Sin foto, emoji centrado en círculo con borde lima. Ultra minimalista.', Component: V2 },
  { num: 3,  title: 'Mini círculos con línea divisoria',      desc: 'Fila horizontal entre separadores de línea fina. Muy sutil.', Component: V3 },
  { num: 4,  title: 'Grid 4×2 — foto en escala de grises',   desc: 'Fotos en grises; al hover recuperan color. Efecto dramático.', Component: V4 },
  { num: 5,  title: 'Lista inline — avatares + texto',        desc: 'Una sola línea horizontal con mini avatares. Ocupa muy poco espacio.', Component: V5 },
  { num: 6,  title: 'Avatares apilados (overlap) + resumen',  desc: 'Círculos solapados estilo "equipo" con texto a la derecha.', Component: V6 },
  { num: 7,  title: 'Lista en 2 filas — avatar + descripción',desc: 'Foto pequeña + nombre + tagline en cada fila. Más informativo.', Component: V7 },
  { num: 8,  title: 'Borde gradiente lima',                   desc: 'Anillo degradado verde lima que se activa en hover. Elegante.', Component: V8 },
  { num: 9,  title: 'Minimalismo extremo — solo nombre',      desc: 'Círculo muy pequeño semi-opaco + nombre. Lo más discreto posible.', Component: V9 },
  { num: 10, title: 'Tamaños variados — jerarquía visual',    desc: 'El primer círculo es más grande, decrecen. Da ritmo.', Component: V10 },
];

export default function IndustriasShowcase() {
  return (
    <div className="min-h-screen bg-[#050a12] text-white">
      <div className="max-w-3xl mx-auto px-6 py-14 space-y-14">
        {/* Header */}
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-white text-sm mb-8 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Volver a la web
          </Link>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#F5C518] mb-2">Showcase</p>
          <h1 className="font-serif text-3xl font-bold text-white mb-2">10 variantes — «Industrias»</h1>
          <p className="text-slate-400 text-sm">Todas con círculos, compactas y minimalistas. Dime el número que te gusta.</p>
        </div>

        {/* Variants */}
        {variants.map(({ num, title, desc, Component }) => (
          <section key={num} className="border-t border-white/8 pt-10">
            <SectionHeader num={num} title={title} desc={desc} />
            <div className="rounded-2xl border border-white/8 bg-[#0a1520] p-6 sm:p-8">
              <Component />
            </div>
          </section>
        ))}

        <div className="border-t border-white/8 pt-8 text-center">
          <p className="text-slate-500 text-sm">¿Cuál te gusta? Dime el número y lo pongo en la web principal.</p>
        </div>
      </div>
    </div>
  );
}

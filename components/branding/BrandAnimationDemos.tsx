'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import s from './brand-animation-demos.module.css';

const BRAND = 'JC ONE FIX';

type DemoPlain = {
  n: number;
  title: string;
  desc: string;
  kind: 'plain';
  className: string;
};

type DemoUnderline = {
  n: number;
  title: string;
  desc: string;
  kind: 'underline';
};

type DemoLetters = {
  n: number;
  title: string;
  desc: string;
  kind: 'letters';
  delayStep: number;
};

type Demo = DemoPlain | DemoUnderline | DemoLetters;

const DEMOS: Demo[] = [
  {
    n: 1,
    title: 'Pulso de escala',
    desc: 'El texto crece y vuelve suavemente, sin giros.',
    kind: 'plain',
    className: s.demo1,
  },
  {
    n: 2,
    title: 'Halo luminoso',
    desc: 'Sombra verde/teal que pulsa alrededor del nombre.',
    kind: 'plain',
    className: s.demo2,
  },
  {
    n: 3,
    title: 'Brillo que cruza',
    desc: 'Franja clara que atraviesa el texto (efecto “shimmer”).',
    kind: 'plain',
    className: s.demo3,
  },
  {
    n: 4,
    title: 'Ritmo de interletraje',
    desc: 'Las letras se separan y juntan en ciclos.',
    kind: 'plain',
    className: s.demo4,
  },
  {
    n: 5,
    title: 'Flotación',
    desc: 'Sube y baja unos píxeles, como flotando.',
    kind: 'plain',
    className: s.demo5,
  },
  {
    n: 6,
    title: 'Vaivén lateral',
    desc: 'Pequeño desplazamiento izquierda–derecha.',
    kind: 'plain',
    className: s.demo6,
  },
  {
    n: 7,
    title: 'Inclinación 2D',
    desc: 'Oscila unos grados en el plano de la pantalla (no es moneda 3D).',
    kind: 'plain',
    className: s.demo7,
  },
  {
    n: 8,
    title: 'Respiración (opacidad)',
    desc: 'Se atenúa y vuelve a plena intensidad.',
    kind: 'plain',
    className: s.demo8,
  },
  {
    n: 9,
    title: 'Línea inferior animada',
    desc: 'Una raya blanca crece debajo del texto y se encoge.',
    kind: 'underline',
  },
  {
    n: 10,
    title: 'Tembleque (skew)',
    desc: 'Inclinación lateral rápida y sutil.',
    kind: 'plain',
    className: s.demo10,
  },
  {
    n: 11,
    title: 'Rebote corto',
    desc: 'Dos pequeños saltos verticales por ciclo.',
    kind: 'plain',
    className: s.demo11,
  },
  {
    n: 12,
    title: 'Matiz suave',
    desc: 'Cambia ligeramente el tono del color (hue) sobre texto lima.',
    kind: 'plain',
    className: s.demo12,
  },
  {
    n: 13,
    title: 'Contraste vivo',
    desc: 'Sube un poco brillo y contraste al ritmo del ciclo.',
    kind: 'plain',
    className: s.demo13,
  },
  {
    n: 14,
    title: 'Pop elástico',
    desc: 'Escala con rebote: grande → pequeño → ajuste final.',
    kind: 'plain',
    className: s.demo14,
  },
  {
    n: 15,
    title: 'Degradé en movimiento',
    desc: 'Blanco, lima y teal se desplazan dentro del texto.',
    kind: 'plain',
    className: s.demo15,
  },
  {
    n: 16,
    title: 'Glitch sutil',
    desc: 'Un parpadeo muy breve con doble sombra de color (casi imperceptible).',
    kind: 'plain',
    className: s.demo16,
  },
  {
    n: 17,
    title: 'Onda por letra',
    desc: 'Cada carácter sube y baja con un pequeño desfase.',
    kind: 'letters',
    delayStep: 0.07,
  },
  {
    n: 18,
    title: 'Gelatina',
    desc: 'Escala en X/Y desincronizada, efecto “jelly”.',
    kind: 'plain',
    className: s.demo18,
  },
  {
    n: 19,
    title: 'Destello de brillo',
    desc: 'Picos cortos de luminosidad cada pocos segundos.',
    kind: 'plain',
    className: s.demo19,
  },
  {
    n: 20,
    title: 'Estirón horizontal',
    desc: 'Se ensancha y vuelve (scaleX), ojo de marca.',
    kind: 'plain',
    className: s.demo20,
  },
];

function BrandPreview({ demo }: { demo: Demo }) {
  if (demo.kind === 'underline') {
    return (
      <span className={cn(s.typography, s.underlineTrack)} suppressHydrationWarning>
        {BRAND}
      </span>
    );
  }
  if (demo.kind === 'letters') {
    return (
      <span className={s.lettersRow} aria-label={BRAND}>
        {BRAND.split('').map((ch, i) => (
          <span
            key={`${i}-${ch === ' ' ? 'sp' : ch}`}
            className={cn(s.letter, s.wave)}
            style={{ animationDelay: `${i * demo.delayStep}s` }}
          >
            {ch === ' ' ? '\u00A0' : ch}
          </span>
        ))}
      </span>
    );
  }
  return <span className={cn(s.typography, demo.className)}>{BRAND}</span>;
}

type Props = {
  backHref: string;
  backLabel: string;
  showDeployHint?: boolean;
};

export function BrandAnimationDemos({ backHref, backLabel, showDeployHint }: Props) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link
          href={backHref}
          className="mb-6 inline-flex items-center gap-2 text-sm text-teal-400 hover:text-teal-300"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>

        <h1 className="text-2xl font-bold tracking-tight text-white">Animaciones del nombre (20 demos)</h1>
        <p className="mt-2 text-sm text-slate-400 leading-relaxed">
          Veinte efectos distintos <strong className="text-slate-300">sin giro 3D horizontal tipo moneda</strong>: pulsos,
          sombras, degradés, ondas, rebotes, etc. La franja verde imita la barra del panel. Con{' '}
          <span className="text-slate-300">reducir movimiento</span> en el sistema, aquí se desactivan todas las animaciones.
        </p>
        {showDeployHint ? (
          <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/90">
            <strong className="text-amber-200">¿404?</strong> Hace falta publicar el código en Vercel. También podés usar{' '}
            <code className="rounded bg-black/30 px-1 py-px font-mono text-[10px]">/dashboard/branding-animations</code> dentro
            del panel.
          </p>
        ) : null}
        <p className="mt-2 text-xs text-slate-500">
          En la barra superior del panel el nombre del taller usa hoy el <strong className="text-slate-400">#15 — degradé
          animado</strong>. Si querés otro número, decilo y lo cambiamos.
        </p>

        <ul className="mt-10 space-y-8">
          {DEMOS.map((d) => (
            <li
              key={d.n}
              className="rounded-xl border border-white/10 bg-white/5 p-5 shadow-lg"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold text-white">
                  {d.n}. {d.title}
                </h2>
                <span className="rounded-full bg-teal-500/20 px-2 py-0.5 text-[11px] font-medium text-teal-300">
                  #{d.n}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-400">{d.desc}</p>

              <div
                className={cn(
                  'mt-5 flex items-center gap-3 rounded-lg bg-[#F5C518] px-4 py-3 ring-1 ring-white/15',
                  s.motionSandbox,
                )}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-sm font-bold text-lime-400 ring-1 ring-white/20">
                  JC
                </span>
                <div className="min-w-0 overflow-visible">
                  <BrandPreview demo={d} />
                  <span className="mt-1 block text-[10px] text-white/50">Centro de Reparaciones</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

import type { ComponentType, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { JcOneFixOneOSymbol } from '@/components/jc-one-fix-brand-icons';

const GOLD = '#F5C518';

export type JcOneFixOneOVariantProps = {
  tone: 'onDark' | 'onLight';
  className?: string;
};

function OWrap({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn('inline-flex items-center justify-center align-middle shrink-0', className)}
      style={{ width: '1.08em', height: '1.08em' }}
      aria-hidden
    >
      {children}
    </span>
  );
}

/** 1 · Anillo doble — O hueca: contorno + anillo gold (sin llave). */
export function JcOneFixOneOSymbolRingHollow({ tone, className }: JcOneFixOneOVariantProps) {
  const outer = tone === 'onDark' ? '#ffffff' : '#0f172a';
  return (
    <OWrap className={className}>
      <svg viewBox="0 0 32 32" className="block size-full" fill="none" aria-hidden>
        <circle cx="16" cy="16" r="11.5" stroke={outer} strokeWidth="2.25" opacity={tone === 'onDark' ? 0.95 : 0.9} />
        <circle cx="16" cy="16" r="7.2" stroke={GOLD} strokeWidth="1.65" opacity="0.92" />
      </svg>
    </OWrap>
  );
}

/** 2 · Disco lima + “1” — ONE literal, contraste teal sobre lima. */
export function JcOneFixOneOSymbolLimeDiscOne({ tone, className }: JcOneFixOneOVariantProps) {
  const ring = tone === 'onLight' ? 'ring-1 ring-slate-300/80' : '';
  return (
    <OWrap className={className}>
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-full bg-[#F5C518] size-full font-extrabold leading-none',
          'text-[0.48em] text-[#0D1117] tracking-tighter',
          ring
        )}
        style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}
      >
        1
      </span>
    </OWrap>
  );
}

/** 3 · Hexágono — pieza técnica como O. */
export function JcOneFixOneOSymbolHex({ tone, className }: JcOneFixOneOVariantProps) {
  const stroke = tone === 'onDark' ? '#ffffff' : '#0f172a';
  return (
    <OWrap className={className}>
      <svg viewBox="0 0 32 32" className="block size-full" aria-hidden>
        <polygon
          points="16,3 28.5,10.25 28.5,21.75 16,29 3.5,21.75 3.5,10.25"
          fill="none"
          stroke={stroke}
          strokeWidth="2"
          strokeLinejoin="round"
          opacity="0.92"
        />
        <polygon
          points="16,8 23,12.1 23,19.9 16,24 9,19.9 9,12.1"
          fill="none"
          stroke={GOLD}
          strokeWidth="1.35"
          strokeLinejoin="round"
          opacity="0.9"
        />
      </svg>
    </OWrap>
  );
}

/** 4 · Dian / precisión — aros finos + punto lima central. */
export function JcOneFixOneOSymbolBullseye({ tone, className }: JcOneFixOneOVariantProps) {
  const stroke = tone === 'onDark' ? '#ffffff' : '#0f172a';
  return (
    <OWrap className={className}>
      <svg viewBox="0 0 32 32" className="block size-full" fill="none" aria-hidden>
        <circle cx="16" cy="16" r="11" stroke={stroke} strokeWidth="1.5" opacity="0.55" />
        <circle cx="16" cy="16" r="7.5" stroke={GOLD} strokeWidth="1.35" opacity="0.85" />
        <circle cx="16" cy="16" r="3.2" stroke={stroke} strokeWidth="1" opacity="0.45" />
        <circle cx="16" cy="16" r="1.5" fill={GOLD} />
      </svg>
    </OWrap>
  );
}

/** 5 · O abierta — arco grueso lima (forma contemporánea, sin disco). */
export function JcOneFixOneOSymbolOpenArc({ tone, className }: JcOneFixOneOVariantProps) {
  const cap = tone === 'onDark' ? '#ffffff' : '#0f172a';
  return (
    <OWrap className={className}>
      <svg viewBox="0 0 32 32" className="block size-full" fill="none" aria-hidden>
        <path
          d="M 26 10.5 A 11 11 0 1 0 26 21.5"
          stroke={GOLD}
          strokeWidth="3.2"
          strokeLinecap="round"
          opacity="0.95"
        />
        <path
          d="M 26 10.5 A 11 11 0 1 0 26 21.5"
          stroke={cap}
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.2"
          transform="translate(0.35,0.35)"
        />
      </svg>
    </OWrap>
  );
}

const DARK_BG = '#0D1117';

/** 6 · Squircle doble — mismo que `JcOneFixOneOSymbol` en producción. */
export function JcOneFixOneOSymbolSquircle(props: JcOneFixOneOVariantProps) {
  return <JcOneFixOneOSymbol {...props} />;
}

/** 7 · Anillo + check — reparación lista, sin llave. */
export function JcOneFixOneOSymbolCheckRing({ tone, className }: JcOneFixOneOVariantProps) {
  const ring = tone === 'onDark' ? '#ffffff' : '#0f172a';
  return (
    <OWrap className={className}>
      <svg viewBox="0 0 32 32" className="block size-full" fill="none" aria-hidden>
        <circle cx="16" cy="16" r="11.5" stroke={ring} strokeWidth="2" opacity="0.55" />
        <path
          d="M 9.5 16.5 L 14 21 L 22.5 11.5"
          stroke={GOLD}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </OWrap>
  );
}

/** 8 · Red mínima — tres nodos unidos (un equipo / un flujo). */
export function JcOneFixOneOSymbolTriNet({ tone, className }: JcOneFixOneOVariantProps) {
  const line = tone === 'onDark' ? '#ffffff' : '#0f172a';
  return (
    <OWrap className={className}>
      <svg viewBox="0 0 32 32" className="block size-full" aria-hidden>
        <path d="M16 6.5 L9 23 L23 23 Z" fill="none" stroke={line} strokeWidth="1.15" opacity="0.35" strokeLinejoin="round" />
        <circle cx="16" cy="6.5" r="2.4" fill={GOLD} />
        <circle cx="9" cy="23" r="2.4" fill={GOLD} />
        <circle cx="23" cy="23" r="2.4" fill={GOLD} />
      </svg>
    </OWrap>
  );
}

/** 9 · Órbita punteada — círculo lima fragmentado (sensorial, ligero). */
export function JcOneFixOneOSymbolDashedOrbit({ tone, className }: JcOneFixOneOVariantProps) {
  const inner = tone === 'onDark' ? '#ffffff' : '#0f172a';
  return (
    <OWrap className={className}>
      <svg viewBox="0 0 32 32" className="block size-full" fill="none" aria-hidden>
        <circle
          cx="16"
          cy="16"
          r="10"
          stroke={GOLD}
          strokeWidth="2.6"
          strokeDasharray="4.2 4.8"
          strokeLinecap="round"
          opacity="0.95"
        />
        <circle cx="16" cy="16" r="4.5" stroke={inner} strokeWidth="1" opacity="0.35" />
      </svg>
    </OWrap>
  );
}

/** 10 · Chip dark — disco de marca invertida: relleno dark, aro gold, punto blanco. */
export function JcOneFixOneOSymbolTealChip({ tone, className }: JcOneFixOneOVariantProps) {
  const spot = tone === 'onDark' ? '#ffffff' : '#f8fafc';
  const ring = tone === 'onLight' ? 'ring-1 ring-slate-300/70' : '';
  return (
    <OWrap className={cn(className, ring)}>
      <svg viewBox="0 0 32 32" className="block size-full" aria-hidden>
        <circle cx="16" cy="16" r="11" fill={DARK_BG} stroke={GOLD} strokeWidth="2" />
        <circle cx="16" cy="16" r="2.2" fill={spot} opacity="0.9" />
      </svg>
    </OWrap>
  );
}

export const JC_ONE_FIX_ONE_O_VARIANTS: {
  id: string;
  title: string;
  blurb: string;
  OneO: ComponentType<JcOneFixOneOVariantProps>;
}[] = [
  {
    id: 'ring-hollow',
    title: '1 · Anillo doble',
    blurb: 'O hueca: aro exterior + anillo gold. Limpio, sin herramienta.',
    OneO: JcOneFixOneOSymbolRingHollow,
  },
  {
    id: 'gold-disc-one',
    title: '2 · Disco gold + 1',
    blurb: 'ONE explícito: círculo gold con “1” dark.',
    OneO: JcOneFixOneOSymbolLimeDiscOne,
  },
  {
    id: 'hex',
    title: '3 · Hexágono',
    blurb: 'Doble contorno hex: pieza técnica, taller / módulo.',
    OneO: JcOneFixOneOSymbolHex,
  },
  {
    id: 'bullseye',
    title: '4 · Diano',
    blurb: 'Aros concéntricos y punto gold; sensación de precisión.',
    OneO: JcOneFixOneOSymbolBullseye,
  },
  {
    id: 'open-arc',
    title: '5 · O abierta',
    blurb: 'Arco gold casi circular; marca más abstracta y ligera.',
    OneO: JcOneFixOneOSymbolOpenArc,
  },
  {
    id: 'squircle',
    title: '6 · Squircle doble',
    blurb: 'Cuadrado redondeado ×2: lectura “O” geométrica, muy legible.',
    OneO: JcOneFixOneOSymbolSquircle,
  },
  {
    id: 'check-ring',
    title: '7 · Anillo + check',
    blurb: 'Cierre / listo: verificador gold dentro de un contorno suave.',
    OneO: JcOneFixOneOSymbolCheckRing,
  },
  {
    id: 'tri-net',
    title: '8 · Red de tres nodos',
    blurb: 'Triángulo de puntos gold: equipo conectado, un solo flujo.',
    OneO: JcOneFixOneOSymbolTriNet,
  },
  {
    id: 'dashed-orbit',
    title: '9 · Órbita punteada',
    blurb: 'Aro gold troceado + núcleo fino; marca ligera y digital.',
    OneO: JcOneFixOneOSymbolDashedOrbit,
  },
  {
    id: 'teal-chip',
    title: '10 · Chip teal',
    blurb: 'Disco dark con borde gold (como el app icon, en miniatura).',
    OneO: JcOneFixOneOSymbolTealChip,
  },
];

type MarkWithOProps = {
  tone?: 'onDark' | 'onLight';
  className?: string;
  OneO: ComponentType<JcOneFixOneOVariantProps>;
};

/** Wordmark completo usando una variante de O (solo para demos). */
export function JcOneFixMarkWithOneO({ tone = 'onDark', className, OneO }: MarkWithOProps) {
  const neClass = tone === 'onLight' ? 'text-slate-900' : 'text-white';
  return (
    <span
      role="img"
      aria-label="JC ONE FIX"
      className={cn(
        'inline-flex items-center align-middle gap-[0.1em] flex-wrap tracking-tight leading-none',
        className
      )}
    >
      <span className="text-[#F5C518]">JC</span>
      <OneO tone={tone} />
      <span className={cn(neClass)}>NE</span>
      <span className="text-[#F5C518]">FIX</span>
    </span>
  );
}

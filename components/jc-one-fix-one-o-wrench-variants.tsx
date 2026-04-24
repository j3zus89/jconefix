import type { ComponentType, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { JcOneFixWrenchGlyph } from '@/components/jc-one-fix-brand-icons';
import type { JcOneFixOneOVariantProps } from '@/components/jc-one-fix-one-o-variants';

function WrenchDisk({
  tone,
  className,
  diskClassName,
  children,
}: JcOneFixOneOVariantProps & { diskClassName?: string; children: ReactNode }) {
  const base =
    tone === 'onDark'
      ? 'bg-white'
      : 'bg-white ring-1 ring-slate-300/90 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)]';
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full align-middle shrink-0 overflow-hidden',
        base,
        diskClassName,
        className
      )}
      style={{ width: '1.08em', height: '1.08em' }}
      aria-hidden
    >
      {children}
    </span>
  );
}

/** Borde gold fino alrededor del disco blanco; llave proporción estándar. */
export function JcOneFixOneOSymbolWrenchLimeBorder(props: JcOneFixOneOVariantProps) {
  return (
    <WrenchDisk {...props} diskClassName="border-2 border-[#F5C518] box-border">
      <JcOneFixWrenchGlyph variant="goldOnWhite" className="h-[56%] w-[56%] shrink-0" />
    </WrenchDisk>
  );
}

/** Llave más grande dentro del mismo círculo. */
export function JcOneFixOneOSymbolWrenchLarge(props: JcOneFixOneOVariantProps) {
  return (
    <WrenchDisk {...props}>
      <JcOneFixWrenchGlyph variant="goldOnWhite" className="h-[72%] w-[72%] shrink-0" />
    </WrenchDisk>
  );
}

/** Halo gold suave alrededor del círculo (misma llave). */
export function JcOneFixOneOSymbolWrenchLimeGlow(props: JcOneFixOneOVariantProps) {
  return (
    <WrenchDisk
      {...props}
      diskClassName="shadow-[0_0_0.22em_rgba(245,197,24,0.55),0_0_0.55em_rgba(245,197,24,0.22)]"
    >
      <JcOneFixWrenchGlyph variant="goldOnWhite" className="h-[58%] w-[58%] shrink-0" />
    </WrenchDisk>
  );
}

/** Anillo gold interior sutil (inset) + llave. */
export function JcOneFixOneOSymbolWrenchInsetLime(props: JcOneFixOneOVariantProps) {
  return (
    <WrenchDisk
      {...props}
      diskClassName="shadow-[inset_0_0_0.18em_rgba(245,197,24,0.38)]"
    >
      <JcOneFixWrenchGlyph variant="goldOnWhite" className="h-[58%] w-[58%] shrink-0" />
    </WrenchDisk>
  );
}

/** Misma llave con giro distinto (~36°). */
export function JcOneFixOneOSymbolWrenchSteepTilt(props: JcOneFixOneOVariantProps) {
  return (
    <WrenchDisk {...props}>
      <span className="inline-flex items-center justify-center size-[72%] rotate-[36deg]">
        <JcOneFixWrenchGlyph variant="goldOnWhite" className="h-full w-full" />
      </span>
    </WrenchDisk>
  );
}

export const JC_ONE_FIX_ONE_O_WRENCH_STYLE_VARIANTS: {
  id: string;
  title: string;
  blurb: string;
  OneO: ComponentType<JcOneFixOneOVariantProps>;
}[] = [
  {
    id: 'wrench-lime-border',
    title: '1 · Borde lima',
    blurb: 'Disco blanco con contorno lima; llave ligeramente más contenida.',
    OneO: JcOneFixOneOSymbolWrenchLimeBorder,
  },
  {
    id: 'wrench-large',
    title: '2 · Llave grande',
    blurb: 'Mismo círculo; herramienta más protagonista (~72%).',
    OneO: JcOneFixOneOSymbolWrenchLarge,
  },
  {
    id: 'wrench-lime-glow',
    title: '3 · Halo lima',
    blurb: 'Brillo exterior suave; lectura “encendida” sobre fondo oscuro.',
    OneO: JcOneFixOneOSymbolWrenchLimeGlow,
  },
  {
    id: 'wrench-inset-lime',
    title: '4 · Anillo interior',
    blurb: 'Viñeta lima hacia dentro; más profundidad sin perder la llave.',
    OneO: JcOneFixOneOSymbolWrenchInsetLime,
  },
  {
    id: 'wrench-steep-tilt',
    title: '5 · Giro distinto',
    blurb: 'Llave rotada ~36° (menos diagonal que el glyph por defecto).',
    OneO: JcOneFixOneOSymbolWrenchSteepTilt,
  },
];

import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/utils';

/** Logotipo oficial (PNG transparente, círculo JC + anillo neón). */
export const JC_ONE_FIX_LOGO_SRC = '/nuevologo.png?v=2';

/** Lucide-compatible wrench silhouette (24×24). */
export const JC_ONE_FIX_WRENCH_PATH =
  'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z';

type WrenchInGlyphProps = {
  className?: string;
  /** Blanco + acento gold (fondo dark / favicon). */
  variant: 'onDark';
} | {
  className?: string;
  /** Llama completa en #F5C518 (interior del círculo blanco de la O). */
  variant: 'goldOnWhite';
};

const JC_ONE_FIX_GOLD = '#F5C518';

/** Glyfo de llave reutilizable en icono app, favicon y letra O. */
export function JcOneFixWrenchGlyph(props: WrenchInGlyphProps) {
  const { className, variant } = props;
  const fill = variant === 'goldOnWhite' ? JC_ONE_FIX_GOLD : '#ffffff';
  const accent = variant === 'onDark';
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn('block', className)}
      aria-hidden
      focusable="false"
    >
      <path
        d={JC_ONE_FIX_WRENCH_PATH}
        fill={fill}
        className={variant === 'goldOnWhite' ? '!fill-[#F5C518]' : undefined}
      />
      {accent && (
        <path
          d="M19.2 2.6c1.1.35 2.1.95 2.9 1.75"
          stroke={JC_ONE_FIX_GOLD}
          strokeWidth="1.35"
          strokeLinecap="round"
          fill="none"
        />
      )}
    </svg>
  );
}

type AppIconProps = ComponentPropsWithoutRef<'span'> & {
  /** Quita el anillo lima si hace falta (p. ej. mockups). */
  hideRing?: boolean;
};

/**
 * Logotipo oficial en UI: imagen PNG circular (JC + anillo neón).
 */
export function JcOneFixAppIcon({ className, hideRing, ...rest }: AppIconProps) {
  return (
    <span
      role="img"
      aria-label="JC ONE FIX"
      className={cn(
        // Logo con esquinas redondeadas
        'inline-flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl',
        className,
      )}
      {...rest}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={JC_ONE_FIX_LOGO_SRC}
        alt=""
        width={120}
        height={120}
        className="block h-full w-full object-cover rounded-2xl"
        draggable={false}
      />
    </span>
  );
}

type OneOSymbolProps = {
  tone: 'onDark' | 'onLight';
  className?: string;
};

/** Sustituye la letra “O” de ONE: squircle doble (aro exterior + aro interior lima; centro hueco). */
export function JcOneFixOneOSymbol({ tone, className }: OneOSymbolProps) {
  const outer = tone === 'onDark' ? '#ffffff' : '#0f172a';
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center shrink-0',
        'h-[0.92em] w-[0.92em] min-h-[0.92em] min-w-[0.92em]',
        // Ligero desplazamiento hacia abajo: con items-center el squircle suele leerse alto frente a mayúsculas sans.
        'relative translate-y-[0.065em]',
        className
      )}
      aria-hidden
    >
      <svg viewBox="0 0 32 32" className="block size-full" fill="none" aria-hidden focusable="false">
        <rect x="3.5" y="3.5" width="25" height="25" rx="8" ry="8" stroke={outer} strokeWidth="2" opacity="0.9" />
        <rect
          x="7.5"
          y="7.5"
          width="17"
          height="17"
          rx="5.5"
          ry="5.5"
          stroke={JC_ONE_FIX_GOLD}
          strokeWidth="1.5"
          opacity="0.92"
        />
      </svg>
    </span>
  );
}

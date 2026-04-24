'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
  /** `nav` = mismo recuadro que el avatar del técnico en el header (`UserMenu`: h-9 w-9). */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'nav';
  title?: string;
  /**
   * `circle`: mismo encuadre que el avatar (círculo + aro). `default`: esquinas redondeadas suaves.
   */
  frame?: 'default' | 'circle';
  /**
   * Ocupa todo el contenedor padre (el padre debe tener tamaño fijo y `overflow-hidden` + bordes).
   * Útil en burbujas del chat para que el PNG no quede como icono pequeño centrado.
   */
  fill?: boolean;
};

const sizeMap = {
  sm: 'h-5 w-5 min-w-[1.25rem] min-h-[1.25rem]',
  md: 'h-[26px] w-[26px] min-w-[26px] min-h-[26px]',
  lg: 'h-8 w-8 min-w-[2rem] min-h-[2rem]',
  xl: 'h-11 w-11 min-w-[2.75rem] min-h-[2.75rem]',
  nav: 'h-9 w-9 min-w-[2.25rem] min-h-[2.25rem]',
};

const sizeToPx: Record<NonNullable<Props['size']>, string> = {
  sm: '20px',
  md: '26px',
  lg: '32px',
  xl: '44px',
  nav: '36px',
};

/** Mascota de soporte (asset en /support-assistant-mascot.png). */
export function SupportAssistantMascot({
  className,
  size = 'md',
  title,
  frame = 'default',
  fill = false,
}: Props) {
  const circle = frame === 'circle';

  if (fill) {
    return (
      <span
        className={cn('relative block h-full w-full min-h-0 min-w-0', className)}
        title={title}
        aria-hidden={title ? undefined : true}
      >
        <Image
          src="/support-assistant-mascot.png"
          alt={title ?? ''}
          title={title}
          fill
          className="object-cover object-center"
          sizes="48px"
        />
      </span>
    );
  }

  return (
    <Image
      src="/support-assistant-mascot.png"
      alt={title ?? ''}
      title={title}
      width={256}
      height={256}
      className={cn(
        sizeMap[size],
        'shrink-0 object-cover',
        circle ? 'rounded-full ring-1 ring-white/25' : 'rounded-xl shadow-sm',
        className,
      )}
      sizes={sizeToPx[size]}
      aria-hidden={title ? undefined : true}
    />
  );
}

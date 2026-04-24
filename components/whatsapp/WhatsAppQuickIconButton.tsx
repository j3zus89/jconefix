'use client';

import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { WhatsAppLogo } from '@/components/whatsapp/WhatsAppLogo';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Texto del botón (por defecto «Enviar», igual que el envío de email). */
  label?: string;
};

/**
 * Botón WhatsApp con el mismo estilo que «Enviar» del panel (teal) + logo.
 */
export function WhatsAppQuickIconButton({
  className,
  label = 'Enviar',
  disabled,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded font-medium text-sm text-white',
        'bg-[#0d9488] hover:bg-[#1d4ed8] disabled:opacity-50 disabled:pointer-events-none',
        'px-4 py-1.5 whitespace-nowrap transition-colors',
        className
      )}
      {...rest}
    >
      <WhatsAppLogo className="h-3.5 w-3.5 shrink-0" />
      {label}
    </button>
  );
}

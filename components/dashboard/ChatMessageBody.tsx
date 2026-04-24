'use client';

import { cn } from '@/lib/utils';

/** Coincide con @nombre o @usuario.apellido (sin espacios en el handle). */
const MENTION_SPLIT_RE = /(@[A-Za-z0-9._áéíóúÁÉÍÓÚñÑ-]+)/g;

type Variant = 'default' | 'onPrimary';

/**
 * Renderiza el texto del chat resaltando @menciones.
 * Si `currentHandle` coincide (p. ej. tu nombre corto o parte del email), el @ a ti se destaca más.
 */
export function ChatMessageBody({
  text,
  currentHandle,
  variant = 'default',
  className,
}: {
  text: string;
  /** Normalmente el mismo `sender_name` del usuario actual (ej. parte antes de @ del email). */
  currentHandle?: string;
  variant?: Variant;
  className?: string;
}) {
  const parts = text.split(MENTION_SPLIT_RE);
  const my = (currentHandle || '').toLowerCase().trim();

  return (
    <span className={cn('block max-w-full break-words [overflow-wrap:anywhere]', className)}>
      {parts.map((part, i) => {
        if (part.startsWith('@')) {
          const handle = part.slice(1).toLowerCase();
          const mentionedMe = my.length > 0 && handle === my;
          const mentionCls =
            variant === 'onPrimary'
              ? mentionedMe
                ? 'bg-amber-300 text-amber-950 ring-1 ring-amber-600/40'
                : 'bg-white/25 text-white ring-1 ring-white/30'
              : mentionedMe
                ? 'bg-amber-200 text-amber-950 ring-1 ring-amber-400/60'
                : 'bg-sky-100 text-sky-900 ring-1 ring-sky-200';
          return (
            <span key={i} className={cn('font-semibold rounded px-0.5 py-px mx-0.5', mentionCls)}>
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

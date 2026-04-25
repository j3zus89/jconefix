'use client';

import type { ReactNode, Ref, KeyboardEvent } from 'react';
import { ArrowUp, CheckCheck, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Doble ✓ estilo WhatsApp: gris = entregado, azul = leído por el cliente. */
export function PanelChatReadReceipt({ read }: { read: boolean }) {
  return (
    <span title={read ? 'Visto' : 'Entregado'} className="inline-flex shrink-0 leading-none" aria-hidden>
      <CheckCheck
        className={cn('h-3.5 w-3.5', read ? 'text-sky-500' : 'text-slate-400')}
        strokeWidth={2.5}
      />
    </span>
  );
}

/** Burbuja entrante (soporte / compañeros): gris claro, esquinas grandes. */
export const panelChatIncomingBubbleClass =
  'rounded-[18px] bg-slate-100 text-slate-900 px-3.5 py-2.5 text-sm leading-relaxed';

/** Burbuja saliente (vos / equipo): verde primario, forma tipo píldora. */
export const panelChatOutgoingBubbleClass =
  'rounded-[22px] bg-primary text-primary-foreground px-4 py-2.5 text-sm leading-relaxed shadow-sm';

export function PanelChatMessageBlock({
  variant,
  senderName,
  timeShort,
  children,
  className,
  avatar,
  readReceipt,
}: {
  variant: 'incoming' | 'outgoing';
  senderName: string;
  timeShort: string;
  children: ReactNode;
  className?: string;
  /** Entrantes: a la izquierda de la burbuja. Salientes: a la derecha de la burbuja. */
  avatar?: ReactNode;
  /** Solo salientes (soporte): recibo tipo WhatsApp junto a la hora. */
  readReceipt?: 'delivered' | 'read';
}) {
  const out = variant === 'outgoing';
  return (
    <div className={cn('flex w-full px-0.5', out ? 'justify-end' : 'justify-start', className)}>
      <div className="flex max-w-[min(92%,360px)] items-end gap-2">
        {!out && avatar ? <div className="shrink-0 pb-5">{avatar}</div> : null}
        <div className={cn('flex min-w-0 flex-col gap-0.5', out ? 'items-end' : 'items-start')}>
          <div className={cn(out ? panelChatOutgoingBubbleClass : panelChatIncomingBubbleClass, 'break-words')}>
            {children}
          </div>
          <p
            className={cn(
              'flex items-center gap-1 text-[10px] tabular-nums px-1',
              out ? 'justify-end text-slate-400' : 'text-left text-slate-400'
            )}
          >
            <span>
              {senderName} · {timeShort}
            </span>
            {out && readReceipt ? (
              <PanelChatReadReceipt read={readReceipt === 'read'} />
            ) : null}
          </p>
        </div>
        {out && avatar ? <div className="shrink-0 pb-5">{avatar}</div> : null}
      </div>
    </div>
  );
}

export function PanelChatComposer({
  value,
  onChange,
  onSend,
  placeholder = 'Escribe un mensaje…',
  disabled,
  sending,
  leading,
  onKeyDown,
  inputRef,
  multiline = false,
  helperText,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
  sending?: boolean;
  leading?: ReactNode;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
  inputRef?: Ref<HTMLTextAreaElement | HTMLInputElement>;
  multiline?: boolean;
  helperText?: ReactNode;
}) {
  const canSend = value.trim().length > 0 && !disabled && !sending;

  const field = multiline ? (
    <textarea
      ref={inputRef as Ref<HTMLTextAreaElement>}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      disabled={disabled || sending}
      placeholder={placeholder}
      className="min-h-[40px] max-h-[120px] min-w-0 flex-1 resize-none border-0 bg-transparent py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 disabled:opacity-60"
    />
  ) : (
    <input
      ref={inputRef as Ref<HTMLInputElement>}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      disabled={disabled || sending}
      placeholder={placeholder}
      className="min-w-0 flex-1 border-0 bg-transparent py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 disabled:opacity-60"
    />
  );

  return (
    <div className="shrink-0 border-t border-slate-200/80 bg-white px-3 pb-3 pt-2">
      <div className="flex items-end gap-1.5 rounded-[22px] border border-slate-200 bg-white pl-2 pr-1.5 py-1 shadow-sm focus-within:border-primary/35 focus-within:ring-1 focus-within:ring-primary/15">
        {leading ? <div className="flex shrink-0 items-center gap-0.5 pb-1 text-slate-400">{leading}</div> : null}
        <div className="min-w-0 flex-1">{field}</div>
        <button
          type="button"
          onClick={() => void onSend()}
          disabled={!canSend}
          className={cn(
            'mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform hover:bg-primary/90 active:scale-95 disabled:pointer-events-none disabled:opacity-35'
          )}
          aria-label="Enviar"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" strokeWidth={2.5} />}
        </button>
      </div>
      {helperText ? <div className="mt-1.5 px-1">{helperText}</div> : null}
    </div>
  );
}

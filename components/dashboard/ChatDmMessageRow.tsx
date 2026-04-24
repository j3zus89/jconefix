'use client';

import { Wrench } from 'lucide-react';
import { DEFAULT_VISUAL_PREFERENCES } from '@/lib/visual-preferences';
import { cn } from '@/lib/utils';
import { ChatMessageBody } from '@/components/dashboard/ChatMessageBody';

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase();
}

/** Convierte hex #RRGGBB a rgba con la opacidad dada. */
function hexRgba(hex: string, alpha: number): string {
  const h = (hex || DEFAULT_VISUAL_PREFERENCES.primaryHex).replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return `rgba(13,148,136,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function ChatAvatar({
  name,
  color,
  url,
  size,
}: {
  name: string;
  color: string;
  url?: string | null;
  size: 'sm' | 'md';
}) {
  const dim = size === 'sm' ? 'h-7 w-7 min-h-7 min-w-7' : 'h-9 w-9 min-h-9 min-w-9';
  const textSz = size === 'sm' ? 'text-[10px]' : 'text-[11px]';
  return (
    <div
      className={cn('relative shrink-0 overflow-hidden rounded-full ring-2 ring-white shadow-sm', dim)}
      style={{ backgroundColor: color }}
    >
      {url ? (
        <img
          src={url}
          alt={name}
          className="h-full w-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div
          className={cn('flex h-full w-full items-center justify-center font-bold text-white', textSz)}
          aria-hidden
        >
          {initialsFromName(name)}
        </div>
      )}
    </div>
  );
}

/**
 * Estilo 3 — burbuja con color del remitente difuminado.
 * Fondo: gradiente translúcido del color del usuario (15→8% opacidad).
 * Borde: color del usuario al 25%.
 * Aplica igual para mensajes propios y ajenos.
 */
export function ChatDmMessageRow({
  senderName,
  senderColor,
  body,
  timeLabel,
  isMe,
  mentionHandle,
  avatarUrl,
  size = 'sm',
  ticketRef,
  roleLabel,
  attachmentUrl,
}: {
  senderName: string;
  senderColor: string;
  body: string;
  timeLabel: string;
  isMe: boolean;
  mentionHandle?: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md';
  ticketRef?: string | null;
  roleLabel?: string | null;
  /** Imagen o enlace mostrado bajo el texto (p. ej. chat soporte). */
  attachmentUrl?: string | null;
}) {
  const isSm = size === 'sm';

  // Burbuja: gradiente del color del usuario, un poco más intenso en el propio
  const bubbleStyle = {
    background: `linear-gradient(135deg, ${hexRgba(senderColor, isMe ? 0.22 : 0.14)} 0%, ${hexRgba(senderColor, isMe ? 0.10 : 0.07)} 100%)`,
    border: `1px solid ${hexRgba(senderColor, isMe ? 0.35 : 0.25)}`,
    boxShadow: `0 1px 3px ${hexRgba(senderColor, 0.12)}`,
  };

  return (
    <div className={cn('flex w-full min-w-0 items-end gap-1.5', isMe ? 'flex-row-reverse' : 'flex-row')}>
      <ChatAvatar name={senderName} color={senderColor} url={avatarUrl} size={size} />

      <div
        className={cn('flex min-w-0 flex-col gap-0.5', isMe ? 'items-end' : 'items-start')}
        style={{ maxWidth: isSm ? 'min(210px, 72%)' : 'min(260px, 76%)' }}
      >
        {/* Nombre del remitente */}
        <div className={cn('max-w-full text-[10px] font-semibold', isMe ? 'pr-0.5 text-right' : 'pl-0.5 text-left')}>
          <span
            className="inline-block max-w-full truncate align-bottom"
            style={{ color: senderColor }}
            title={roleLabel ? `${senderName} — ${roleLabel}` : senderName}
          >
            {senderName}
            {roleLabel && (
              <span className="font-normal text-gray-400"> · {roleLabel}</span>
            )}
          </span>
        </div>

        {/* Badge de ticket referenciado */}
        {ticketRef && (
          <div className="flex w-fit max-w-full items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-800 ring-1 ring-blue-100">
            <Wrench className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
            <span>Ticket #{ticketRef}</span>
          </div>
        )}

        {/* Burbuja */}
        <div
          className={cn(
            'w-fit max-w-full rounded-2xl',
            isSm ? 'px-2.5 py-1.5' : 'px-3 py-2',
            isMe ? 'rounded-br-sm' : 'rounded-bl-sm'
          )}
          style={bubbleStyle}
        >
          <ChatMessageBody
            text={body}
            currentHandle={mentionHandle}
            variant="default"
            className={cn('font-normal leading-snug tracking-tight text-gray-900', isSm ? 'text-[13px]' : 'text-[14px]')}
          />
          {attachmentUrl ? (
            /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(attachmentUrl) ? (
              <a
                href={attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 block max-w-full"
              >
                <div className="relative mt-0.5 h-28 w-full max-w-[220px] overflow-hidden rounded-lg border border-black/10 bg-black/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={attachmentUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </a>
            ) : (
              <a
                href={attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-block text-[11px] font-semibold underline"
                style={{ color: senderColor }}
              >
                Ver adjunto
              </a>
            )
          ) : null}
          <p
            className="mt-0.5 text-[10px] tabular-nums text-right"
            style={{ color: hexRgba(senderColor, 0.65) }}
          >
            {timeLabel}
          </p>
        </div>
      </div>
    </div>
  );
}

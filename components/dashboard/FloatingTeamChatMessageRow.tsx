'use client';

import { ChatMessageBody } from '@/components/dashboard/ChatMessageBody';
import { PanelChatMessageBlock } from '@/components/dashboard/PanelChatShell';

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase();
}

type Props = {
  senderName: string;
  senderColor: string;
  avatarUrl?: string | null;
  body: string;
  timeLabel: string;
  createdAtIso: string;
  mentionHandle?: string;
  /** URL firmada para abrir / previsualizar el adjunto. */
  attachmentUrl?: string | null;
  /** Ruta u origen almacenado (para detectar imagen vs PDF). */
  attachmentPathForKind?: string | null;
  /** Mensajes propios a la derecha (burbuja verde); del resto del equipo a la izquierda. */
  isOwnMessage: boolean;
};

/**
 * Formato tipo mensajería moderna: entrantes grises con avatar cuadrado; salientes verdes (primary).
 */
export function FloatingTeamChatMessageRow({
  senderName,
  senderColor,
  avatarUrl,
  body,
  timeLabel,
  createdAtIso,
  mentionHandle,
  attachmentUrl,
  attachmentPathForKind,
  isOwnMessage,
}: Props) {
  const avatar = (
    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-200/90">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center text-[11px] font-bold text-white"
          style={{ backgroundColor: senderColor }}
        >
          {initialsFromName(senderName)}
        </div>
      )}
    </div>
  );

  const bubble = (
    <>
      {body.trim().length > 0 ? (
        <div className="leading-relaxed">
          <ChatMessageBody text={body} currentHandle={mentionHandle} />
        </div>
      ) : null}
      {attachmentPathForKind || attachmentUrl ? (
        <div className={body.trim().length > 0 ? 'mt-2' : ''}>
          {!attachmentUrl ? (
            <span className="text-xs text-slate-400">Cargando adjunto…</span>
          ) : /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(attachmentPathForKind || attachmentUrl) ? (
            <a
              href={attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block max-w-full overflow-hidden rounded-xl border border-black/5 bg-black/5"
            >
              <img
                src={attachmentUrl}
                alt=""
                className="max-h-48 w-full object-contain"
                loading="lazy"
              />
            </a>
          ) : (
            <a
              href={attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={
                isOwnMessage
                  ? 'inline-flex max-w-full items-center gap-1.5 break-all rounded-lg border border-white/25 bg-white/15 px-3 py-2 text-xs font-medium text-white underline-offset-2 hover:underline'
                  : 'inline-flex max-w-full items-center gap-1.5 break-all rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-primary hover:bg-slate-50'
              }
            >
              Ver archivo adjunto
            </a>
          )}
        </div>
      ) : null}
    </>
  );

  return (
    <div className="pb-1" data-created={createdAtIso}>
      <PanelChatMessageBlock
        variant={isOwnMessage ? 'outgoing' : 'incoming'}
        senderName={isOwnMessage ? 'Vos' : senderName}
        timeShort={timeLabel}
        avatar={avatar}
      >
        {isOwnMessage &&
        attachmentUrl &&
        /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(attachmentPathForKind || attachmentUrl) ? (
          <div className="[&_a]:border-white/25 [&_img]:opacity-95">{bubble}</div>
        ) : (
          bubble
        )}
      </PanelChatMessageBlock>
    </div>
  );
}

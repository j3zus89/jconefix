/** Canal Realtime (broadcast) por usuario del panel: el taller avisa si está escribiendo. */
export const SUPPORT_TYPING_BROADCAST_EVENT = 'typing' as const;

export function supportTypingChannelId(userId: string): string {
  return `support-typing-${userId}`;
}

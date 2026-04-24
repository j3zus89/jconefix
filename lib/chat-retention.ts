/** Días de historial visible y tras los cuales se pueden purgar mensajes en BD. */
export const CHAT_HISTORY_RETENTION_DAYS = 7;

/** ISO UTC desde el que cargar mensajes (inicio del día hace N días). */
export function getChatMessagesSinceIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - CHAT_HISTORY_RETENTION_DAYS);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

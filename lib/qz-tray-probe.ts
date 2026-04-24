import { humanizeQzTrayError } from '@/lib/qz-tray-errors';
import { runWithQzTray, type QzTrayConnectOptions } from '@/lib/qz-tray-session';

/**
 * Comprueba si QZ Tray responde (puerto guardado y, si falla, puertos por defecto de QZ).
 */
export async function probeQzTray(
  options: QzTrayConnectOptions
): Promise<{ ok: true; version: string } | { ok: false; message: string }> {
  const r = await runWithQzTray(options, (qz) => qz.api.getVersion());
  if (!r.ok) {
    return { ok: false, message: humanizeQzTrayError(r.message) };
  }
  return { ok: true, version: String(r.value) };
}

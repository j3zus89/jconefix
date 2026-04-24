import type qzType from 'qz-tray';
import { humanizeQzTrayError } from '@/lib/qz-tray-errors';
import { runWithQzTray, type QzTrayConnectOptions } from '@/lib/qz-tray-session';

/** Lista nombres de impresoras que expone QZ Tray en el equipo local. */
export async function fetchQzPrinterNames(
  options: QzTrayConnectOptions
): Promise<{ ok: true; names: string[] } | { ok: false; message: string; names: string[] }> {
  const r = await runWithQzTray(options, async (qz: typeof qzType) => {
    const found = await qz.printers.find();
    if (Array.isArray(found)) {
      return found.map((x) => String(x));
    }
    if (typeof found === 'string' && found) {
      return [found];
    }
    return [];
  });

  if (!r.ok) {
    return { ok: false, message: humanizeQzTrayError(r.message), names: [] };
  }
  return { ok: true, names: r.value };
}

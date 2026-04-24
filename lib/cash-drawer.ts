/**
 * Apertura de cajón portamonedas via QZ Tray con comando ESC/POS.
 * Comando: ESC p 0 25 250  (kick pin 2, duración 25 × 2ms encendido, 250 × 2ms apagado)
 */
import { runWithQzTray, type QzTrayConnectOptions } from '@/lib/qz-tray-session';

/** Bytes ESC/POS para abrir cajón portamonedas (pin 2). */
const DRAWER_KICK_BYTES = [0x1b, 0x70, 0x00, 0x19, 0xfa] as const;

type QzPrintApi = {
  printers: { getDefault: () => Promise<string> };
  configs: { create: (printer: string, opts?: Record<string, unknown>) => unknown };
  print: (config: unknown, data: unknown[]) => Promise<void>;
};

/**
 * Intenta abrir el cajón portamonedas via QZ Tray.
 * Retorna `{ ok, message }` sin lanzar excepciones.
 */
export async function openCashDrawer(
  qzConnect: QzTrayConnectOptions,
): Promise<{ ok: boolean; message: string }> {
  const result = await runWithQzTray(qzConnect, async (qz) => {
    const qzAny = qz as unknown as QzPrintApi;
    const printer = await qzAny.printers.getDefault();
    if (!printer || typeof printer !== 'string') {
      throw new Error('No se encontró ninguna impresora para abrir el cajón.');
    }

    const config = qzAny.configs.create(printer);
    await qzAny.print(config, [
      {
        type: 'raw',
        format: 'command',
        data: String.fromCharCode(...DRAWER_KICK_BYTES),
      },
    ]);
  });

  if (result.ok) {
    return { ok: true, message: 'Cajón abierto correctamente.' };
  }
  return { ok: false, message: result.message };
}

/**
 * Construye opciones de conexión QZ a partir de las filas de shop_settings.
 * Exportado para reutilizar sin importar invoice-print-deliver.
 */
export function shopSettingsToQzConnect(row: {
  qz_tray_port?: unknown;
  qz_tray_using_secure?: unknown;
  qz_tray_certificate_pem?: string | null;
} | null | undefined): QzTrayConnectOptions {
  const raw = row?.qz_tray_port;
  const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? ''), 10);
  const port = Number.isFinite(n) && n > 0 && n <= 65535 ? n : 8182;
  return {
    port,
    usingSecure: Boolean(row?.qz_tray_using_secure),
    certificatePem: row?.qz_tray_certificate_pem?.trim() || null,
  };
}

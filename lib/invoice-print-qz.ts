import { humanizeQzTrayError } from '@/lib/qz-tray-errors';
import { runWithQzTray, type QzTrayConnectOptions } from '@/lib/qz-tray-session';

type QzPrintApi = {
  printers: {
    getDefault: () => Promise<string>;
  };
  configs: {
    create: (printer: string, opts?: Record<string, unknown>) => unknown;
  };
  print: (config: unknown, data: unknown[]) => Promise<void>;
};

/**
 * Envía un documento HTML completo a la impresora predeterminada (o la indicada) vía QZ Tray.
 */
export async function printInvoiceHtmlWithQz(
  htmlDocument: string,
  connect: QzTrayConnectOptions,
  printerName?: string | null
): Promise<{ ok: true } | { ok: false; message: string }> {
  const r = await runWithQzTray(connect, async (qz) => {
    const qzAny = qz as unknown as QzPrintApi;
    let printer = printerName?.trim();
    if (!printer) {
      printer = await qzAny.printers.getDefault();
    }
    if (!printer || typeof printer !== 'string') {
      throw new Error('No hay impresora predeterminada en el sistema.');
    }
    const config = qzAny.configs.create(printer, {
      scaleContent: true,
      rasterize: false,
      orientation: 'portrait',
      margins: { top: 0.35, right: 0.35, bottom: 0.35, left: 0.35 },
      units: 'in',
    });
    const data = [
      {
        type: 'pixel',
        format: 'html',
        flavor: 'plain',
        data: htmlDocument,
      },
    ];
    await qzAny.print(config, data);
  });

  if (r.ok) return { ok: true };
  return { ok: false, message: humanizeQzTrayError(r.message) };
}

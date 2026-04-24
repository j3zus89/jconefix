import type qzType from 'qz-tray';

export type QzTrayConnectOptions = {
  port: number;
  usingSecure: boolean;
  certificatePem: string | null;
};

export type RunWithQzTrayExtras = {
  /** Si falla el puerto/host configurado, reintenta con la lista por defecto de QZ (8181, 8182, 8282…). */
  tryDefaultPortsOnFailure?: boolean;
};

async function disconnectSafe(qz: typeof qzType): Promise<void> {
  try {
    if (qz.websocket.isActive()) {
      await qz.websocket.disconnect().catch(() => {});
    }
  } catch {
    /* ignore */
  }
}

/**
 * Conecta a QZ Tray, ejecuta `work` y desconecta. No deja el socket abierto.
 */
export async function runWithQzTray<T>(
  options: QzTrayConnectOptions,
  work: (qz: typeof qzType) => Promise<T>,
  extras?: RunWithQzTrayExtras
): Promise<{ ok: true; value: T } | { ok: false; message: string }> {
  if (typeof window === 'undefined') {
    return { ok: false, message: 'Solo disponible en el navegador.' };
  }

  const port = Number(options.port);
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    return { ok: false, message: 'Puerto no válido (1–65535).' };
  }

  const qz = (await import('qz-tray')).default as typeof qzType;

  const pem = options.certificatePem?.trim() || null;
  if (pem) {
    qz.security.setCertificatePromise(() => Promise.resolve(pem));
  } else {
    qz.security.setCertificatePromise((resolve, reject) => {
      reject();
    });
  }

  const portBlock = options.usingSecure
    ? { secure: [port], insecure: [] as number[], portIndex: 0 }
    : { secure: [] as number[], insecure: [port], portIndex: 0 };

  const tryDefault = extras?.tryDefaultPortsOnFailure !== false;

  const connectCustom = async () => {
    await disconnectSafe(qz);
    await qz.websocket.connect({
      usingSecure: options.usingSecure,
      port: portBlock,
      retries: 0,
      delay: 0,
      keepAlive: 0,
    });
  };

  /** Sin `port`/`usingSecure` forzados: QZ recorre localhost y localhost.qz.io en 8181/8182/8282/… */
  const connectQzDefaults = async () => {
    await disconnectSafe(qz);
    await qz.websocket.connect({
      keepAlive: 0,
    });
  };

  try {
    await connectCustom();
    const value = await work(qz);
    await disconnectSafe(qz);
    return { ok: true, value };
  } catch (e1) {
    await disconnectSafe(qz);
    if (!tryDefault) {
      const msg = e1 instanceof Error ? e1.message : String(e1);
      return { ok: false, message: msg };
    }
    try {
      await connectQzDefaults();
      const value = await work(qz);
      await disconnectSafe(qz);
      return { ok: true, value };
    } catch (e2) {
      await disconnectSafe(qz);
      const msg = e2 instanceof Error ? e2.message : String(e2);
      return { ok: false, message: msg };
    }
  }
}

/** Traduce errores típicos del cliente QZ Tray a texto útil en español. */
export function humanizeQzTrayError(raw: string): string {
  const m = raw.trim();
  const lower = m.toLowerCase();

  if (/unable to establish connection with qz/i.test(m)) {
    return (
      'No se pudo conectar con QZ Tray. Instalalo desde qz.io, dejalo abierto en la bandeja del sistema ' +
      'y aceptá este sitio si QZ lo pide. Revisá abajo el puerto y «Conexión segura (WSS)» según uses HTTP o HTTPS; ' +
      'al pulsar «Comprobar conexión» también se prueban automáticamente los puertos habituales de QZ.'
    );
  }

  if (lower.includes('connection attempt cancelled')) {
    return 'Conexión cancelada. Volvé a intentar.';
  }

  if (lower.includes('websocket not supported')) {
    return 'Tu navegador no permite WebSocket; probá con Chrome o Edge actualizado.';
  }

  if (lower.includes('failed to sign request')) {
    return 'Falló la firma de la petición. Sin servidor de firma, permití el acceso en el diálogo de QZ Tray.';
  }

  if (lower.includes('an open connection with qz tray already exists')) {
    return 'Ya hay una conexión QZ abierta. Recargá la página o esperá unos segundos.';
  }

  return m;
}

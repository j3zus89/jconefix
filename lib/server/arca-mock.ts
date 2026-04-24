/**
 * Modo simulación AFIP — activo cuando AFIP_MOCK_MODE=true en variables de entorno.
 *
 * Permite probar el flujo completo (subida de certificado → test de conexión →
 * factura de prueba) sin credenciales AFIP reales ni llamadas a producción/homologación.
 *
 * NUNCA activar en producción. Solo para desarrollo / staging sin certificado argentino.
 */

export const AFIP_MOCK_MODE = process.env.AFIP_MOCK_MODE === 'true';

export type MockStep = {
  name: string;
  status: 'ok' | 'fail';
  detail: string;
};

/** Simula el resultado de testArcaAfipConnection (estructura idéntica). */
export function mockTestConnection(): {
  steps: MockStep[];
  salesPoints: number[];
  lastVoucherNumber: number;
} {
  return {
    steps: [
      { name: 'Servidor WSFE', status: 'ok', detail: '[SIMULACIÓN] FEDummy respondió AppServer=OK, DbServer=OK, AuthServer=OK' },
      { name: 'Autenticación WSAA', status: 'ok', detail: '[SIMULACIÓN] Token de acceso obtenido correctamente para el CUIT registrado.' },
      { name: 'Puntos de venta', status: 'ok', detail: '[SIMULACIÓN] Puntos de venta 1, 2 disponibles en AFIP.' },
      { name: 'Último comprobante', status: 'ok', detail: '[SIMULACIÓN] Último comprobante tipo 11 en PV 1: nro. 42.' },
    ],
    salesPoints: [1, 2],
    lastVoucherNumber: 42,
  };
}

/** Simula la autorización de una factura (resultado idéntico al real). */
export function mockAuthorizeInvoice(): {
  CAE: string;
  CAEFchVto: string;
  voucherNumber: number;
} {
  const now = new Date();
  const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const cae = `7${String(Date.now()).slice(-12)}00`;
  return {
    CAE: cae,
    CAEFchVto: fmt(expires),
    voucherNumber: Math.floor(Math.random() * 8000) + 1000,
  };
}

/** Simula un error de AFIP para probar el manejo de errores. */
export function mockAfipError(type: 'cert_expired' | 'cuit_mismatch' | 'invalid_pv'): Error {
  const msgs: Record<string, string> = {
    cert_expired: 'Tu certificado está vencido. Renovalo en el sitio de AFIP y volvé a subirlo.',
    cuit_mismatch: 'El CUIT no coincide con el certificado AFIP. Verificá el CUIT del taller en ajustes.',
    invalid_pv: 'Punto de venta no habilitado en AFIP. Comprobá el número en tu cuenta de AFIP.',
  };
  return new Error(msgs[type] ?? 'Error simulado de AFIP.');
}

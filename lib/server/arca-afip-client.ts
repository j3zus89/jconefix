import { decryptArcaSecret } from '@/lib/arca-credentials-crypto';
import { parseCuitNumber } from '@/lib/arca-cuit';
import {
  hasValidTokenInMemory,
  markTokenObtained,
  invalidateToken,
} from '@/lib/server/arca-wsaa-cache';

/**
 * Cache de instancias Afip por proceso.
 * Clave: "{organizationId}:{prod|dev}"
 *
 * Mantener la misma instancia evita el round-trip HTTP a app.afipsdk.com
 * para obtener el token WSAA en cada request (instancias Lambda warm = ~80% del tráfico).
 * El TTL lo gestiona `arca-wsaa-cache.ts` (12 h con margen de 5 min).
 */
const afipInstanceCache = new Map<string, { instance: InstanceType<typeof Afip>; cuit: number; production: boolean }>();

function instanceCacheKey(organizationId: string, production: boolean): string {
  return `${organizationId}:${production ? 'prod' : 'dev'}`;
}

/** Expone para que los llamadores registren autenticación exitosa. */
export { markTokenObtained, invalidateToken };

export const ARCA_CONNECTION_ERROR =
  'No hubo comunicación con los servidores de ARCA/AFIP. Revisá la conexión e intentá de nuevo en unos minutos.';

type AfipElectronicBilling = {
  createNextVoucher: (
    data: Record<string, string | number | null | object[]>
  ) => Promise<{ CAE: string; CAEFchVto: string; voucherNumber: number }>;
};

const Afip = require('@afipsdk/afip.js') as new (opts: {
  CUIT: number | string;
  cert?: string;
  key?: string;
  production?: boolean;
  access_token: string;
}) => {
  ElectronicBilling: AfipElectronicBilling;
};

/**
 * Convierte errores del SDK / red en mensajes claros para el técnico (sin volcar SOAP/XML largo).
 */
export function mapAfipSdkError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const t = raw.trim();
  const m = t.toLowerCase();

  if (
    m.includes('enotfound') ||
    m.includes('econnrefused') ||
    m.includes('etimedout') ||
    m.includes('econnreset') ||
    m.includes('socket hang up') ||
    m.includes('network error') ||
    m.includes('networkerror') ||
    /\b5\d\d\b/.test(t) ||
    m.includes('status code 403') ||
    m.includes('status code 401') ||
    m.includes('fetch failed')
  ) {
    return ARCA_CONNECTION_ERROR;
  }

  if (m.includes('unauthorized') || (m.includes('token') && m.includes('expir'))) {
    return 'ARCA/AFIP no aceptó la autenticación. Revisá el certificado, el entorno (homologación/producción) y que el servidor tenga configurado el token del Afip SDK.';
  }

  if (
    m.includes('duplicado') ||
    m.includes('duplicate') ||
    m.includes('ya existe') ||
    m.includes('already registered') ||
    (m.includes('cbte') && m.includes('registr'))
  ) {
    return 'AFIP indicó que el comprobante está duplicado o el número ya fue usado. No repitas el cobro: revisá las facturas de este ticket o el último comprobante en ARCA.';
  }

  if (m.includes('punto de venta') || m.includes('ptovta') || m.includes('pto vta')) {
    return 'Revisá el punto de venta en Ajustes → ARCA y que sea el mismo que diste de alta en AFIP para facturación electrónica.';
  }

  if (m.includes('cuit') && (m.includes('invalid') || m.includes('inválido') || m.includes('no coincide'))) {
    return 'El CUIT del emisor o del cliente no coincide con lo que espera AFIP. Verificá el CUIT del taller en ajustes y el documento del cliente en el ticket.';
  }

  if (t.includes('<') && (t.includes('soap') || t.includes('xml') || t.includes('fault'))) {
    return 'ARCA/AFIP rechazó el comprobante. Revisá CUIT, punto de venta, condición IVA del taller y del cliente, e importes. Si el rechazo sigue, consultá el detalle en el sitio de ARCA/AFIP.';
  }

  const looksLikeCodeStack = /at\s+[\w.]+\s*\(|\.tsx?:\d+|\.jsx?:\d+/i.test(t);
  if (looksLikeCodeStack || t.length > 240) {
    return 'ARCA/AFIP rechazó la autorización del comprobante. Revisá los datos fiscales y la configuración ARCA del taller; si el mensaje es muy técnico, copiá el error desde los registros del servidor o consultá en ARCA.';
  }

  return t || ARCA_CONNECTION_ERROR;
}

export type ArcaStoredCredentials = {
  cert_pem_enc: string;
  key_pem_enc: string;
  production: boolean;
  punto_venta?: number | null;
};

export async function buildConfiguredAfip(params: {
  organizationId: string;
  registrationNumber: string | null | undefined;
  row: ArcaStoredCredentials;
}): Promise<
  | { ok: true; afip: InstanceType<typeof Afip> }
  | { ok: false; message: string }
> {
  const token = process.env.AFIP_SDK_ACCESS_TOKEN?.trim();
  if (!token) {
    return {
      ok: false,
      message:
        'Falta configurar el servicio de facturación en el servidor (token Afip SDK). Avisá a quien mantiene el hosting.',
    };
  }

  const cuit = parseCuitNumber(params.registrationNumber);
  if (cuit == null) {
    return {
      ok: false,
      message:
        'Configurá el CUIT del emisor en Ajustes → Número de registro / CUIT (11 dígitos) antes de cobrar con factura electrónica.',
    };
  }

  let cert: string;
  let key: string;
  try {
    cert = decryptArcaSecret(params.row.cert_pem_enc, params.organizationId);
    key = decryptArcaSecret(params.row.key_pem_enc, params.organizationId);
  } catch {
    return { ok: false, message: ARCA_CONNECTION_ERROR };
  }

  if (!cert.includes('BEGIN CERTIFICATE') || !key.includes('PRIVATE KEY')) {
    return {
      ok: false,
      message:
        'El certificado o la clave privada guardados no son válidos. Volvé a subirlos desde Ajustes → ARCA.',
    };
  }

  const production = params.row.production === true;
  const ikey = instanceCacheKey(params.organizationId, production);

  // Reusar instancia cacheada si el token en memoria sigue siendo válido
  const cached = afipInstanceCache.get(ikey);
  if (cached && cached.cuit === cuit && hasValidTokenInMemory(params.organizationId, production)) {
    return { ok: true, afip: cached.instance };
  }

  const afip = new Afip({ CUIT: cuit, cert, key, production, access_token: token });

  // Guardar instancia y marcar token (se refrescará en la próxima op. exitosa)
  afipInstanceCache.set(ikey, { instance: afip, cuit, production });

  return { ok: true, afip };
}

/**
 * Validación pre-vuelo (pre-flight) antes de enviar cualquier comprobante a AFIP.
 *
 * Bloquea si:
 *  - No hay certificado guardado
 *  - El certificado está vencido (según cert_expires_at guardado al subir)
 *  - El CUIT del certificado no coincide con shop_settings.registration_number
 *  - No hay punto de venta configurado
 *
 * Devuelve null si todo OK, o un string con el mensaje de error humano.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { parseCuitNumber } from '@/lib/arca-cuit';

export type PreflightResult =
  | { ok: true }
  | { ok: false; message: string; field: 'cert' | 'expiry' | 'cuit' | 'pv' | 'config' };

export async function arcaPreflightCheck(
  admin: SupabaseClient,
  organizationId: string
): Promise<PreflightResult> {
  // 1. Leer credenciales
  const { data: cred } = await admin
    .from('organization_arca_credentials')
    .select('cert_expires_at, cert_cuit_detected, punto_venta')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (!cred) {
    return {
      ok: false,
      field: 'cert',
      message:
        'No hay certificado AFIP guardado. Subí el certificado (.p12 o .crt+.key) en Ajustes → Impuestos → AFIP/ARCA.',
    };
  }

  // 2. Certificado vencido
  if (cred.cert_expires_at) {
    const expires = new Date(cred.cert_expires_at as string);
    if (!Number.isNaN(expires.getTime()) && expires < new Date()) {
      const fmtDate = expires.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      return {
        ok: false,
        field: 'expiry',
        message: `El certificado AFIP venció el ${fmtDate}. Renovalo en el sitio de AFIP y subí el nuevo desde Ajustes → Impuestos → AFIP/ARCA.`,
      };
    }
  }

  // 3. Punto de venta
  const pv = cred.punto_venta != null ? Number(cred.punto_venta) : null;
  if (!pv || !Number.isFinite(pv) || pv < 1 || pv > 9999) {
    return {
      ok: false,
      field: 'pv',
      message:
        'No hay punto de venta configurado. Ingresalo en Ajustes → Impuestos → AFIP/ARCA, paso 2 (el mismo número que diste de alta en AFIP).',
    };
  }

  // 4. CUIT del certificado vs CUIT del taller
  const certCuit = cred.cert_cuit_detected
    ? String(cred.cert_cuit_detected).replace(/\D/g, '')
    : null;

  if (certCuit && certCuit.length === 11) {
    // Solo chequeamos si tenemos el shop CUIT y si el cert tiene uno
    const { data: org } = await admin
      .from('organizations')
      .select('owner_id')
      .eq('id', organizationId)
      .maybeSingle();

    if (org?.owner_id) {
      const { data: shop } = await admin
        .from('shop_settings')
        .select('registration_number')
        .eq('user_id', org.owner_id as string)
        .maybeSingle();

      const shopCuitRaw = (shop?.registration_number as string | null) ?? '';
      const shopCuitDigits = shopCuitRaw.replace(/\D/g, '');

      if (shopCuitDigits.length === 11 && shopCuitDigits !== certCuit) {
        return {
          ok: false,
          field: 'cuit',
          message: `El CUIT del taller (${shopCuitRaw}) no coincide con el CUIT en el certificado AFIP (${certCuit}). AFIP rechazará el comprobante. Corregí el CUIT en Ajustes → Impuestos o subí el certificado correcto.`,
        };
      }

      const shopCuitNum = parseCuitNumber(shopCuitRaw);
      if (shopCuitNum == null) {
        return {
          ok: false,
          field: 'cuit',
          message:
            'El CUIT del taller no está configurado o tiene un formato inválido (11 dígitos). Ingresalo en Ajustes → Impuestos.',
        };
      }
    }
  }

  return { ok: true };
}

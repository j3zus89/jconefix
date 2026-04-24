import forge from 'node-forge';

export type CertInfo = {
  /** CUIT detectado en el certificado (solo dígitos, 11 chars), null si no se detectó. */
  cuitDetected: string | null;
  /** Fecha de vencimiento ISO 8601. */
  expiresAt: string | null;
  /** CN del Subject (nombre del titular). */
  subjectCN: string | null;
};

/**
 * Extrae certificado y clave privada en PEM desde un .p12/.pfx.
 */
export function extractPemFromPkcs12(p12Buffer: Buffer, password: string): { cert: string; key: string } {
  const der = forge.util.createBuffer(p12Buffer.toString('binary'));
  let p12: forge.pkcs12.Pkcs12Pfx;
  try {
    const asn1 = forge.asn1.fromDer(der);
    p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, password);
  } catch {
    throw new Error('No se pudo leer el .p12 (contraseña incorrecta o archivo dañado).');
  }

  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag];
  const keyBags =
    p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] ||
    p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag];

  const cert = certBags?.[0]?.cert;
  const key = keyBags?.[0]?.key;

  if (!cert || !key) {
    throw new Error('El .p12 no contiene certificado y clave privada reconocibles.');
  }

  return {
    cert: forge.pki.certificateToPem(cert),
    key: forge.pki.privateKeyToPem(key),
  };
}

/**
 * Extrae CUIT y vencimiento desde un certificado en PEM (AFIP/ARCA).
 * El CUIT suele estar en el campo SERIALNUMBER o CN del Subject
 * con el formato "CUIT 20XXXXXXXXX" o solo los 11 dígitos.
 */
export function extractCertInfoFromPem(certPem: string): CertInfo {
  let cert: forge.pki.Certificate;
  try {
    cert = forge.pki.certificateFromPem(certPem);
  } catch {
    return { cuitDetected: null, expiresAt: null, subjectCN: null };
  }

  const getAttr = (name: string): string | null => {
    try {
      const a = cert.subject.getField(name);
      return a ? String(a.value) : null;
    } catch {
      return null;
    }
  };

  const subjectCN = getAttr('CN');
  const serialAttr = getAttr('SERIALNUMBER') ?? getAttr('serialNumber');

  // Extraer 11 dígitos continuos (CUIT) de cualquiera de los campos
  const parseCuit = (s: string | null): string | null => {
    if (!s) return null;
    const m = s.replace(/\D/g, '');
    return m.length === 11 ? m : null;
  };

  const cuitDetected =
    parseCuit(serialAttr) ??
    parseCuit(subjectCN) ??
    (() => {
      // Buscar patrón "CUIT XXXXXXXXXXX" en cualquier campo del subject
      for (const attr of cert.subject.attributes) {
        const v = String(attr.value || '');
        const m = v.match(/\bCUIT\s*(\d{11})\b/i) ?? v.match(/\b(\d{2}-\d{8}-\d)\b/);
        if (m) return m[1]!.replace(/\D/g, '');
      }
      return null;
    })();

  let expiresAt: string | null = null;
  try {
    const d = cert.validity.notAfter;
    if (d instanceof Date && !Number.isNaN(d.getTime())) {
      expiresAt = d.toISOString();
    }
  } catch {
    /* skip */
  }

  return { cuitDetected, expiresAt, subjectCN };
}

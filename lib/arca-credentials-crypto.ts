import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;
const SALT = 'jconefix-arca-v1';

function masterKey(): Buffer {
  const b64 = process.env.ARCA_CREDENTIALS_MASTER_KEY?.trim();
  if (!b64) {
    throw new Error('ARCA_CREDENTIALS_MASTER_KEY no está configurada en el servidor.');
  }
  const key = Buffer.from(b64, 'base64');
  if (key.length !== 32) {
    throw new Error('ARCA_CREDENTIALS_MASTER_KEY debe ser exactamente 32 bytes en Base64.');
  }
  return key;
}

/** Derivación adicional por organización (aisla ciphertext entre tenants si la master key se reutilizara). */
function derivedKey(orgId: string): Buffer {
  return scryptSync(masterKey(), `${SALT}:${orgId}`, 32);
}

/**
 * Cifra texto UTF-8. Salida: base64(iv || tag || ciphertext).
 */
export function encryptArcaSecret(plain: string, organizationId: string): string {
  const key = derivedKey(organizationId);
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptArcaSecret(payloadB64: string, organizationId: string): string {
  const key = derivedKey(organizationId);
  const buf = Buffer.from(payloadB64, 'base64');
  if (buf.length < IV_LEN + TAG_LEN + 1) {
    throw new Error('Payload cifrado inválido.');
  }
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const data = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

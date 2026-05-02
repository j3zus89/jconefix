import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const SALT = 'jconefix-premium-direct-v1';
const KEY_LEN = 32;

function getKey(): Buffer {
  const secret =
    process.env.PREMIUM_DIRECT_ENC_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'dev-only-premium-direct-insecure';
  return scryptSync(secret, SALT, KEY_LEN);
}

export type PremiumDirectEncryptedPayload = {
  v: 1;
  token: string;
  full_name: string;
  email: string;
  password: string;
  shop_name: string;
  country_iso: string;
  fiscal_id?: string;
};

export function encryptPremiumDirectPayload(obj: PremiumDirectEncryptedPayload): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const plain = Buffer.from(JSON.stringify(obj), 'utf8');
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64url');
}

export function decryptPremiumDirectPayload(blob: string): PremiumDirectEncryptedPayload | null {
  try {
    const raw = Buffer.from(blob, 'base64url');
    if (raw.length < 28) return null;
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const enc = raw.subarray(28);
    const key = getKey();
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    const j = JSON.parse(dec.toString('utf8')) as PremiumDirectEncryptedPayload;
    if (j.v !== 1 || !j.token || !j.email || !j.password) return null;
    return j;
  } catch {
    return null;
  }
}

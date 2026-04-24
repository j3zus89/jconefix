import type { SupabaseClient } from '@supabase/supabase-js';

/** Caducidad de URLs firmadas (segundos); ~60 minutos. */
export const STORAGE_SIGNED_URL_TTL_SEC = 3600;

/**
 * Obtiene la ruta del objeto dentro del bucket a partir de lo guardado en BD
 * (ruta relativa o URL pública / firmada antigua de Supabase).
 */
export function storageObjectPathFromStoredValue(
  stored: string | null | undefined,
  bucketId: string,
): string | null {
  const s = String(stored ?? '').trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) {
    const p = s.replace(/^\//, '');
    return p || null;
  }
  const pub = `/object/public/${bucketId}/`;
  const sig = `/object/sign/${bucketId}/`;
  let idx = s.indexOf(pub);
  let prefixLen = pub.length;
  if (idx < 0) {
    idx = s.indexOf(sig);
    prefixLen = sig.length;
  }
  if (idx < 0) return null;
  const rest = s.slice(idx + prefixLen);
  const rawPath = rest.split('?')[0] ?? '';
  try {
    return decodeURIComponent(rawPath) || null;
  } catch {
    return rawPath || null;
  }
}

export async function createSignedUrlForStoredObject(
  supabase: SupabaseClient,
  bucketId: string,
  stored: string | null | undefined,
): Promise<string | null> {
  const path = storageObjectPathFromStoredValue(stored, bucketId);
  if (!path) {
    const raw = String(stored ?? '').trim();
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    return null;
  }
  const { data, error } = await supabase.storage
    .from(bucketId)
    .createSignedUrl(path, STORAGE_SIGNED_URL_TTL_SEC);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export type SignedAttachmentEntry = { key: string; stored: string | null | undefined };

/**
 * Firma por lotes rutas únicas y devuelve URL por clave lógica (p. ej. id de mensaje).
 */
export async function buildSignedUrlMapForEntries(
  supabase: SupabaseClient,
  bucketId: string,
  entries: SignedAttachmentEntry[],
): Promise<Record<string, string>> {
  const keyByPath = new Map<string, string[]>();
  const passthrough: Record<string, string> = {};

  for (const { key, stored } of entries) {
    const raw = String(stored ?? '').trim();
    if (!raw) continue;
    const path = storageObjectPathFromStoredValue(raw, bucketId);
    if (!path) {
      if (raw.startsWith('http://') || raw.startsWith('https://')) passthrough[key] = raw;
      continue;
    }
    const list = keyByPath.get(path);
    if (list) list.push(key);
    else keyByPath.set(path, [key]);
  }

  const uniquePaths = Array.from(keyByPath.keys());
  if (uniquePaths.length === 0) return { ...passthrough };

  const { data } = await supabase.storage
    .from(bucketId)
    .createSignedUrls(uniquePaths, STORAGE_SIGNED_URL_TTL_SEC);

  const pathToSigned = new Map<string, string>();
  for (const row of data ?? []) {
    if (row.path && row.signedUrl) pathToSigned.set(row.path, row.signedUrl);
  }

  const out: Record<string, string> = { ...passthrough };
  keyByPath.forEach((keys, path) => {
    const u = pathToSigned.get(path);
    if (!u) return;
    for (const k of keys) out[k] = u;
  });
  return out;
}

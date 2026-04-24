import type { SupabaseClient } from '@supabase/supabase-js';
import { humanizeAvatarStorageError } from '@/lib/supabase-setup-hints';

const BUCKET = 'avatars';
const MAX_BYTES = 15 * 1024 * 1024;

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Sube una imagen de perfil a Storage (bucket `avatars`, carpeta = userId).
 * Devuelve la URL pública. Requiere migración 202604022105_avatars_storage_and_profile.
 */
export async function uploadProfileAvatar(
  supabase: SupabaseClient,
  userId: string,
  file: File
): Promise<string> {
  if (!file || file.size === 0) {
    throw new Error('No se ha seleccionado ningún archivo');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('El archivo supera el máximo de 15 MB');
  }
  const type = file.type.toLowerCase();
  if (!ALLOWED.includes(type)) {
    throw new Error('Formato no permitido. Usa JPG, PNG, WebP o GIF');
  }

  const rawExt = file.name.split('.').pop()?.toLowerCase();
  const ext =
    rawExt && /^[a-z0-9]{2,5}$/.test(rawExt)
      ? rawExt
      : type === 'image/png'
        ? 'png'
        : type === 'image/webp'
          ? 'webp'
          : type === 'image/gif'
            ? 'gif'
            : 'jpg';

  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: type,
  });

  if (upErr) {
    const msg = upErr.message || '';
    const out = humanizeAvatarStorageError(msg);
    throw new Error(out || 'Error al subir la imagen');
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error('No se pudo obtener la URL de la imagen');
  }
  return data.publicUrl;
}

import type { SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'ticket-images';
const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/gif',
];

/**
 * Sube un archivo de imagen al bucket `ticket-images` de Supabase Storage.
 * Devuelve la ruta del objeto (bucket privado; usar createSignedUrl para mostrar).
 *
 * @param supabase  Cliente Supabase autenticado (cliente del navegador)
 * @param ticketId  ID del ticket — se usa como carpeta
 * @param userId    ID del usuario — parte de la ruta para RLS
 * @param file      Archivo a subir
 * @param prefix    Prefijo del nombre de archivo (ej. "pre", "post", "attach")
 */
export async function uploadTicketImage(
  supabase: SupabaseClient,
  ticketId: string,
  userId: string,
  file: File,
  prefix: string = 'img',
): Promise<string> {
  if (!file || file.size === 0) throw new Error('Archivo vacío');
  if (file.size > MAX_BYTES) throw new Error(`El archivo supera el máximo de ${MAX_BYTES / 1024 / 1024} MB`);

  const mimeType = file.type.toLowerCase() || 'image/jpeg';
  if (!ALLOWED_TYPES.includes(mimeType)) {
    throw new Error('Formato no permitido. Usa JPEG, PNG, WebP, HEIC o GIF.');
  }

  const ext = file.name.split('.').pop()?.toLowerCase()?.replace(/[^a-z0-9]/g, '') || 'jpg';
  const fileName = `${userId}/${ticketId}/${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await (supabase as any).storage.from(BUCKET).upload(fileName, file, {
    cacheControl: '31536000',
    upsert: false,
    contentType: mimeType,
  });

  if (error) {
    const msg: string = (error as { message?: string }).message || '';
    if (msg.toLowerCase().includes('bucket') && msg.toLowerCase().includes('not found')) {
      throw new Error('El bucket de imágenes no está configurado en Supabase. Ejecuta las migraciones pendientes.');
    }
    if (msg.toLowerCase().includes('policy') || msg.toLowerCase().includes('not authorized') || msg.toLowerCase().includes('row level')) {
      throw new Error('Sin permiso para subir imágenes. Comprueba las políticas RLS del bucket ticket-images.');
    }
    throw new Error(msg || 'Error al subir la imagen');
  }

  return fileName;
}

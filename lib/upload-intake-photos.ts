import type { SupabaseClient } from '@supabase/supabase-js';
import { uploadTicketImage } from '@/lib/upload-ticket-image';

/**
 * Sube fotos de ingreso (webcam) al bucket y registra filas en `ticket_images` como pre_repair.
 */
export async function uploadIntakeEvidencePhotos(
  supabase: SupabaseClient,
  ticketId: string,
  userId: string,
  files: File[],
): Promise<void> {
  if (!files.length) return;
  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    const path = await uploadTicketImage(supabase, ticketId, userId, file, `intake_${i + 1}`);
    const { error } = await (supabase as any).from('ticket_images').insert({
      ticket_id: ticketId,
      shop_owner_id: userId,
      image_type: 'pre_repair',
      image_url: path,
      thumbnail_url: path,
      file_name: file.name || `ingreso_${i + 1}.jpg`,
      file_size: file.size,
      description: `Estado del equipo al ingreso (evidencia ${i + 1} de ${files.length})`,
      uploaded_by: 'Recepción',
    });
    if (error) throw new Error(error.message || 'Error al registrar la imagen');
  }
}

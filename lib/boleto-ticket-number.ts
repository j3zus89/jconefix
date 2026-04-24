import type { SupabaseClient } from '@supabase/supabase-js';
import type { TicketNumberStyle } from '@/lib/ticket-repairs-settings';

/** Texto guardado en repair_tickets.ticket_number (la UI añade el prefijo «Boleto»). */
export async function reserveNextBoletoTicketNumber(
  supabase: SupabaseClient,
  organizationId: string,
  style: TicketNumberStyle = 'padded_four'
): Promise<string> {
  const { data, error } = await (supabase as any).rpc('next_boleto_ticket_number', {
    p_organization_id: organizationId,
    p_style: style,
  });
  if (error) {
    throw new Error(
      error.message ||
        'No se pudo generar el número de boleto. En Supabase ejecuta las migraciones de boletos (p. ej. 202604121200_next_boleto_ticket_number_style.sql).'
    );
  }
  if (typeof data !== 'string' || !data.trim()) {
    throw new Error('Respuesta inválida al reservar número de boleto.');
  }
  return data.trim();
}

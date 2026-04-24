import type { SupabaseClient } from '@supabase/supabase-js';
import {
  parseTicketRepairsSettings,
  type TicketRepairsSettings,
} from '@/lib/ticket-repairs-settings';

/** Ajustes de entradas/reparaciones del taller (fila shop_settings de la organización activa). */
export async function fetchTicketRepairsSettingsForOrg(
  supabase: SupabaseClient,
  organizationId: string | null
): Promise<TicketRepairsSettings> {
  if (!organizationId) return parseTicketRepairsSettings(null);
  const { data, error } = await (supabase as any)
    .from('shop_settings')
    .select('ticket_repairs_settings')
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (error || !data) return parseTicketRepairsSettings(null);
  return parseTicketRepairsSettings(data.ticket_repairs_settings);
}

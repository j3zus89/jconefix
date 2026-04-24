import type { SupabaseClient } from '@supabase/supabase-js';
import type { IntakeLaborServicePick } from '@/lib/ticket-intake-labor-part';
import { parseMoneyInput } from '@/lib/ticket-intake-labor-part';

const PRICE_EPS = 1e-4;

/**
 * Si en recepción se eligió un servicio del tarifario y el precio escrito difiere del catálogo,
 * actualiza la fila en `repair_labor_services` para que el listado maestro quede alineado.
 */
export async function persistRepairLaborPriceFromIntake(
  supabase: SupabaseClient,
  labor: IntakeLaborServicePick | null,
  priceInput: string
): Promise<{ errorMessage?: string }> {
  if (!labor?.id) return {};

  const edited = parseMoneyInput(priceInput);
  if (edited === null) return {};

  const rounded = Math.round(edited * 100) / 100;
  const catalog = Number(labor.price);
  if (!Number.isFinite(catalog) || Math.abs(rounded - catalog) < PRICE_EPS) return {};

  const { error } = await (supabase as any)
    .from('repair_labor_services')
    .update({ price: rounded, source: 'manual' })
    .eq('id', labor.id);

  if (error) {
    console.error('persistRepairLaborPriceFromIntake', error);
    return {
      errorMessage:
        'El ticket se guardó, pero no se pudo actualizar el precio en Inventario → Servicio de reparación.',
    };
  }
  return {};
}

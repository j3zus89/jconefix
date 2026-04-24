import type { SupabaseClient } from '@supabase/supabase-js';

export type ReturnConstanciaSyncInput = {
  repair_ticket_id: string;
  organization_id: string | null;
  shop_owner_id: string | null;
  customer_id: string | null;
  related_invoice_id: string | null;
  scenario: string;
  settlement_method: string | null;
  summary_line: string;
  detail: string | null;
  amount_money: number | null;
  status: 'registered' | 'delivered';
  delivered_at: string | null;
  created_by_user_id: string;
};

export async function syncCustomerReturnConstancia(
  supabase: SupabaseClient,
  input: ReturnConstanciaSyncInput
): Promise<{ error: Error | null; constanciaId: string | null }> {
  const { data: existing, error: selErr } = await (supabase as any)
    .from('customer_return_constancias')
    .select('id')
    .eq('repair_ticket_id', input.repair_ticket_id)
    .maybeSingle();

  if (selErr) return { error: new Error(selErr.message), constanciaId: null };

  const row = {
    organization_id: input.organization_id,
    shop_owner_id: input.shop_owner_id,
    repair_ticket_id: input.repair_ticket_id,
    customer_id: input.customer_id,
    related_invoice_id: input.related_invoice_id,
    scenario: input.scenario || 'other',
    settlement_method: input.settlement_method,
    summary_line: (input.summary_line || '').trim().slice(0, 500) || 'Devolución',
    detail: input.detail?.trim() || null,
    amount_money: input.amount_money,
    status: input.status,
    delivered_at: input.delivered_at,
    created_by_user_id: input.created_by_user_id,
  };

  if (existing?.id) {
    const { error } = await (supabase as any)
      .from('customer_return_constancias')
      .update(row)
      .eq('id', existing.id);
    return {
      error: error ? new Error(error.message) : null,
      constanciaId: error ? null : existing.id,
    };
  }

  const { data: ins, error } = await (supabase as any)
    .from('customer_return_constancias')
    .insert(row)
    .select('id')
    .maybeSingle();
  return {
    error: error ? new Error(error.message) : null,
    constanciaId: ins?.id ?? null,
  };
}

export async function deleteCustomerReturnConstancia(
  supabase: SupabaseClient,
  repairTicketId: string
): Promise<{ error: Error | null }> {
  const { error } = await (supabase as any)
    .from('customer_return_constancias')
    .delete()
    .eq('repair_ticket_id', repairTicketId);
  return { error: error ? new Error(error.message) : null };
}

export async function fetchReturnConstanciaIdByTicket(
  supabase: SupabaseClient,
  repairTicketId: string
): Promise<string | null> {
  const { data } = await (supabase as any)
    .from('customer_return_constancias')
    .select('id')
    .eq('repair_ticket_id', repairTicketId)
    .maybeSingle();
  return data?.id ?? null;
}

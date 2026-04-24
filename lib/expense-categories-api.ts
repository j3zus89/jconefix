import type { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_EXPENSE_CATEGORY_NAMES } from '@/lib/expense-category-defaults';

export type ExpenseCategoryRow = {
  id: string;
  organization_id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

/** Carga nombres ordenados; si falla la tabla o no hay org, devuelve la lista estática. */
export async function fetchExpenseCategoryNames(
  supabase: SupabaseClient,
  organizationId: string | null
): Promise<string[]> {
  if (!organizationId) return [...DEFAULT_EXPENSE_CATEGORY_NAMES];
  const { data, error } = await supabase
    .from('expense_categories')
    .select('name')
    .eq('organization_id', organizationId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error || !data?.length) return [...DEFAULT_EXPENSE_CATEGORY_NAMES];
  return data.map((r: { name: string }) => r.name);
}

/** Inserta las categorías por defecto si la organización no tiene ninguna. */
export async function ensureExpenseCategoriesSeeded(
  supabase: SupabaseClient,
  organizationId: string
): Promise<void> {
  const { count, error: countErr } = await supabase
    .from('expense_categories')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId);
  if (countErr) throw countErr;
  if ((count ?? 0) > 0) return;
  const rows = DEFAULT_EXPENSE_CATEGORY_NAMES.map((name, i) => ({
    organization_id: organizationId,
    name,
    sort_order: i,
  }));
  const { error } = await supabase.from('expense_categories').insert(rows);
  if (error) throw error;
}

export async function fetchExpenseCategoryRows(
  supabase: SupabaseClient,
  organizationId: string
): Promise<ExpenseCategoryRow[]> {
  const { data, error } = await supabase
    .from('expense_categories')
    .select('id, organization_id, name, sort_order, created_at')
    .eq('organization_id', organizationId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  return (data || []) as ExpenseCategoryRow[];
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { requireSuperAdminFromRequest } from '@/lib/auth/super-admin-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const PROTECTED_EMAILS = new Set([
  'sr.gonzalezcala89@gmail.com',
  'sr.gonzalezcala@gmail.com',
]);

// Helper: ejecuta una delete. Retorna el error si hay (no tira excepción).
async function del(
  label: string,
  query: PromiseLike<{ error: any }>,
): Promise<string | null> {
  const { error } = await query;
  if (error) {
    console.warn(`[delete-user] ${label}: ${error.message}`);
    return `${label}: ${error.message}`;
  }
  return null;
}

/**
 * Eliminación en cascada completa de un usuario.
 * Cubre TODAS las tablas del proyecto con FK a auth.users o a sus datos derivados.
 */
async function purgeUserFull(
  sb: SupabaseClient<any, any, any>,
  userId: string,
): Promise<{ ok: boolean; error?: string; warnings?: string[] }> {
  const warns: string[] = [];
  const w = async (label: string, query: PromiseLike<{ error: any }>) => {
    const err = await del(label, query);
    if (err) warns.push(err);
  };
  try {
    // ── Paso 1: Obtener org IDs donde este usuario es OWNER ──────────────────
    const { data: ownedOrgs } = await sb
      .from('organizations')
      .select('id')
      .eq('owner_id', userId);
    const orgIds: string[] = (ownedOrgs ?? []).map((o: { id: string }) => o.id);

    // ── Paso 2: Recolectar TODOS los ticket IDs y invoice IDs del usuario ─────
    const { data: userTickets } = await sb.from('repair_tickets').select('id').eq('user_id', userId);
    let allTicketIds = (userTickets ?? []).map((t: { id: string }) => t.id);

    const { data: userInvoices } = await sb.from('invoices').select('id').eq('shop_owner_id', userId);
    let allInvoiceIds = (userInvoices ?? []).map((i: { id: string }) => i.id);

    if (orgIds.length) {
      const { data: orgTickets } = await sb.from('repair_tickets').select('id').in('organization_id', orgIds);
      const orgTicketIds = (orgTickets ?? []).map((t: { id: string }) => t.id);
      allTicketIds = Array.from(new Set([...allTicketIds, ...orgTicketIds]));

      const { data: orgInvoices } = await sb.from('invoices').select('id').in('organization_id', orgIds);
      const orgInvoiceIds = (orgInvoices ?? []).map((i: { id: string }) => i.id);
      allInvoiceIds = Array.from(new Set([...allInvoiceIds, ...orgInvoiceIds]));
    }

    // ── Paso 3: Tablas hijas de repair_tickets ────────────────────────────────
    // Estas tablas tienen shop_owner_id → auth.users SIN CASCADE (bloqueante).
    // Borrar por shop_owner_id DIRECTO (cubre todos los registros del usuario)
    await w('ticket_parts.owner',           sb.from('ticket_parts').delete().eq('shop_owner_id', userId));
    await w('ticket_inventory_items.owner', sb.from('ticket_inventory_items').delete().eq('shop_owner_id', userId));
    await w('ticket_images.owner',          sb.from('ticket_images').delete().eq('shop_owner_id', userId));
    await w('ticket_conditions.owner',      sb.from('ticket_conditions').delete().eq('shop_owner_id', userId));
    await w('ticket_accessories.owner',     sb.from('ticket_accessories').delete().eq('shop_owner_id', userId));
    await w('payments.owner',               sb.from('payments').delete().eq('shop_owner_id', userId));
    // También por ticket_id para registros de org sin user directo
    if (allTicketIds.length) {
      await w('ticket_parts.tid',            sb.from('ticket_parts').delete().in('ticket_id', allTicketIds));
      await w('ticket_comments.tid',         sb.from('ticket_comments').delete().in('ticket_id', allTicketIds));
      await w('ticket_inventory_items.tid',  sb.from('ticket_inventory_items').delete().in('ticket_id', allTicketIds));
      await w('ticket_images.tid',           sb.from('ticket_images').delete().in('ticket_id', allTicketIds));
      await w('ticket_conditions.tid',       sb.from('ticket_conditions').delete().in('ticket_id', allTicketIds));
      await w('ticket_accessories.tid',      sb.from('ticket_accessories').delete().in('ticket_id', allTicketIds));
      await w('payments.tid',                sb.from('payments').delete().in('ticket_id', allTicketIds));
    }
    // ticket_comments donde el autor es este usuario (en tickets ajenos)
    await w('ticket_comments.uid', sb.from('ticket_comments').delete().eq('user_id', userId));

    // ── Paso 4: Tablas hijas de invoices ─────────────────────────────────────
    if (allInvoiceIds.length) {
      await w('invoice_items', sb.from('invoice_items').delete().in('invoice_id', allInvoiceIds));
    }

    // ── Paso 5: FKs sin CASCADE que bloquean auth.admin.deleteUser ────────────
    await w('org_members.invited_by', sb.from('organization_members').update({ invited_by: null }).eq('invited_by', userId));
    await w('audit_log.target',       sb.from('super_admin_audit_log').delete().eq('target_user_id', userId));
    await w('audit_log.admin',        sb.from('super_admin_audit_log').delete().eq('admin_user_id', userId));

    // ── Paso 6: Tablas con user_id directo ───────────────────────────────────
    await w('user_panel_sessions',       sb.from('user_panel_sessions').delete().eq('user_id', userId));
    await w('support_chat_messages',     sb.from('support_chat_messages').delete().eq('user_id', userId));
    await w('panel_notifications',       sb.from('panel_notifications').delete().eq('user_id', userId));
    await w('invoice_saved_filters',     sb.from('invoice_saved_filters').delete().eq('user_id', userId));
    await w('repair_tickets.uid',        sb.from('repair_tickets').delete().eq('user_id', userId));
    await w('invoices.owner',            sb.from('invoices').delete().eq('shop_owner_id', userId));
    await w('technicians.owner',         sb.from('technicians').delete().eq('shop_owner_id', userId));
    await w('customers.uid',             sb.from('customers').delete().eq('user_id', userId));
    await w('inventory_items.uid',       sb.from('inventory_items').delete().eq('user_id', userId));
    await w('products.uid',              sb.from('products').delete().eq('user_id', userId));
    await w('chat_messages.uid',         sb.from('chat_messages').delete().eq('user_id', userId));
    await w('expenses.uid',              sb.from('expenses').delete().eq('user_id', userId));
    await w('pos_sales.uid',             sb.from('pos_sales').delete().eq('user_id', userId));
    await w('suppliers.uid',             sb.from('suppliers').delete().eq('user_id', userId));
    await w('purchase_orders.uid',       sb.from('purchase_orders').delete().eq('user_id', userId));
    await w('shifts.uid',                sb.from('shifts').delete().eq('user_id', userId));
    await w('cash_movements.uid',        sb.from('cash_movements').delete().eq('user_id', userId));
    await w('time_records.uid',          sb.from('time_records').delete().eq('user_id', userId));
    await w('inventory_transfers.uid',   sb.from('inventory_transfers').delete().eq('user_id', userId));
    await w('emails.uid',                sb.from('emails').delete().eq('user_id', userId));
    // Configuración personalizada del taller
    await w('custom_ticket_statuses',    sb.from('custom_ticket_statuses').delete().eq('user_id', userId));
    await w('task_types',                sb.from('task_types').delete().eq('user_id', userId));
    await w('payment_methods',           sb.from('payment_methods').delete().eq('user_id', userId));
    await w('repair_categories',         sb.from('repair_categories').delete().eq('user_id', userId));
    await w('role_permissions',          sb.from('role_permissions').delete().eq('user_id', userId));

    // ── Paso 7: Tablas por organization_id (para orgs propiedad del usuario) ──
    if (orgIds.length) {
      // Tickets hijos primero (si quedaron tickets de org sin user_id directo)
      const { data: remainOrg } = await sb.from('repair_tickets').select('id').in('organization_id', orgIds);
      const remainIds = (remainOrg ?? []).map((t: { id: string }) => t.id);
      if (remainIds.length) {
        await w('ticket_parts.org',           sb.from('ticket_parts').delete().in('ticket_id', remainIds));
        await w('ticket_comments.org.tid',    sb.from('ticket_comments').delete().in('ticket_id', remainIds));
        await w('ticket_inventory_items.org', sb.from('ticket_inventory_items').delete().in('ticket_id', remainIds));
        await w('ticket_images.org',          sb.from('ticket_images').delete().in('ticket_id', remainIds));
        await w('ticket_conditions.org',      sb.from('ticket_conditions').delete().in('ticket_id', remainIds));
        await w('ticket_accessories.org',     sb.from('ticket_accessories').delete().in('ticket_id', remainIds));
        await w('payments.org.tid',           sb.from('payments').delete().in('ticket_id', remainIds));
      }
      const { data: remainInv } = await sb.from('invoices').select('id').in('organization_id', orgIds);
      const remainInvIds = (remainInv ?? []).map((i: { id: string }) => i.id);
      if (remainInvIds.length) {
        await w('invoice_items.org', sb.from('invoice_items').delete().in('invoice_id', remainInvIds));
      }

      await w('invoice_saved_filters.org',     sb.from('invoice_saved_filters').delete().in('organization_id', orgIds));
      await w('panel_notifications.org',        sb.from('panel_notifications').delete().in('organization_id', orgIds));
      await w('expense_categories.org',         sb.from('expense_categories').delete().in('organization_id', orgIds));
      await w('expenses.org',                   sb.from('expenses').delete().in('organization_id', orgIds));
      await w('pos_sales.org',                  sb.from('pos_sales').delete().in('organization_id', orgIds));
      await w('chat_messages.org',              sb.from('chat_messages').delete().in('organization_id', orgIds));
      await w('products.org',                   sb.from('products').delete().in('organization_id', orgIds));
      await w('inventory_items.org',            sb.from('inventory_items').delete().in('organization_id', orgIds));
      await w('customers.org',                  sb.from('customers').delete().in('organization_id', orgIds));
      await w('invoices.org',                   sb.from('invoices').delete().in('organization_id', orgIds));
      await w('repair_tickets.org',             sb.from('repair_tickets').delete().in('organization_id', orgIds));
      await w('technicians.org',                sb.from('technicians').delete().in('organization_id', orgIds));
      await w('suppliers.org',                  sb.from('suppliers').delete().in('organization_id', orgIds));
      await w('purchase_orders.org',            sb.from('purchase_orders').delete().in('organization_id', orgIds));
      await w('inventory_transfers.org',        sb.from('inventory_transfers').delete().in('organization_id', orgIds));
      await w('custom_ticket_statuses.org',     sb.from('custom_ticket_statuses').delete().in('organization_id', orgIds));
      await w('task_types.org',                 sb.from('task_types').delete().in('organization_id', orgIds));
      await w('payment_methods.org',            sb.from('payment_methods').delete().in('organization_id', orgIds));
      await w('repair_categories.org',          sb.from('repair_categories').delete().in('organization_id', orgIds));
      await w('role_permissions.org',           sb.from('role_permissions').delete().in('organization_id', orgIds));
      await w('organization_custom_roles',      sb.from('organization_custom_roles').delete().in('organization_id', orgIds));
      await w('org_role_label_overrides',       sb.from('organization_role_label_overrides').delete().in('organization_id', orgIds));
      await w('organization_boleto_counter',    sb.from('organization_boleto_counter').delete().in('organization_id', orgIds));
    }

    // ── Paso 8: shop_settings, miembros y org ────────────────────────────────
    await w('shop_settings.uid', sb.from('shop_settings').delete().eq('user_id', userId));
    if (orgIds.length) {
      await w('shop_settings.org',        sb.from('shop_settings').delete().in('organization_id', orgIds));
      await w('organization_members.org', sb.from('organization_members').delete().in('organization_id', orgIds));
      await w('organizations',            sb.from('organizations').delete().in('id', orgIds));
    }
    await w('organization_members.uid', sb.from('organization_members').delete().eq('user_id', userId));

    // ── Paso 9: Perfil (FK directa a auth.users) ─────────────────────────────
    await w('profiles', sb.from('profiles').delete().eq('id', userId));

    return { ok: true, warnings: warns };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e), warnings: warns };
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdminFromRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const { userIds } = body;
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Proteger cuentas de super-admin
  const protectedIds = new Set<string>();
  const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const users = (list as any)?.users ?? [];
  for (const u of users) {
    if (u.email && PROTECTED_EMAILS.has(u.email)) protectedIds.add(u.id);
  }

  const toDelete = userIds.filter((id: string) => id && !protectedIds.has(id));
  const skipped  = userIds.filter((id: string) => protectedIds.has(id));

  const results: { id: string; ok: boolean; error?: string }[] = [];

  for (const id of toDelete) {
    // 1) Limpiar todas las tablas públicas en cascada
    const purge = await purgeUserFull(supabaseAdmin, id);
    const purgeWarnings = purge.warnings ?? [];

    if (!purge.ok) {
      results.push({ id, ok: false, error: `Purge failed: ${purge.error}. Warnings: ${purgeWarnings.join(' | ')}` });
      continue;
    }

    // 2) Borrar de auth.users
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (authErr) {
      // Incluir warnings del purge para diagnóstico
      const detail = purgeWarnings.length
        ? `${authErr.message} | Purge warnings: ${purgeWarnings.join(' | ')}`
        : authErr.message;
      results.push({ id, ok: false, error: detail });
    } else {
      results.push({ id, ok: true });
    }
  }

  // Auditoría (no crítica)
  try {
    await supabaseAdmin.rpc('log_super_admin_action', {
      p_action: 'delete_users_bulk',
      p_target_org_id: null,
      p_target_user_id: null,
      p_details: {
        requested: userIds.length,
        deleted: results.filter((r) => r.ok).length,
        skipped,
        errors: results.filter((r) => !r.ok),
      },
    });
  } catch { /* log no es crítico */ }

  const errors  = results.filter((r) => !r.ok);
  const deleted = results.filter((r) => r.ok).map((r) => r.id);
  const status  = errors.length > 0 && deleted.length === 0 ? 500
                : errors.length > 0 ? 207
                : 200;

  return NextResponse.json(
    { success: deleted.length > 0, data: { deleted, errors, skipped } },
    { status },
  );
}


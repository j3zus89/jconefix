'use client';

/**
 * Hook: lee los permisos del usuario actual desde organization_members.permissions.
 *
 * Lógica de resolución:
 *  1. Si el usuario es OWNER de la org → todos los permisos activos (es el jefe).
 *  2. Si tiene un registro en organization_members → se usan esos permisos.
 *  3. Si no tiene registro (usuario independiente sin org) → permisos máximos
 *     (es el único usuario de su propio taller).
 *
 * Los permisos de cobro:
 *  - receptionist → can_collect_payment=true, can_open_drawer=true  (por defecto)
 *  - tech_1/2/3/technician → can_collect_payment=false (a menos que se active)
 *  - owner/admin/manager → siempre true
 */

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getActiveOrganizationId } from '@/lib/dashboard-org';

export type MyPermissions = {
  can_create_tickets: boolean;
  can_edit_tickets: boolean;
  can_delete_tickets: boolean;
  can_view_reports: boolean;
  can_manage_inventory: boolean;
  can_manage_customers: boolean;
  can_manage_settings: boolean;
  can_create_invoices: boolean;
  can_view_all_tickets: boolean;
  can_manage_pos: boolean;
  can_manage_expenses: boolean;
  can_export_data: boolean;
  /** Puede cobrar tickets y abrir el modal de cobro. */
  can_collect_payment: boolean;
  /** Puede abrir el cajón portamonedas manualmente. */
  can_open_drawer: boolean;
  /** Rol actual del usuario en esta org. */
  role: string;
  /** Si aún está cargando. */
  loading: boolean;
};

/** Roles que siempre tienen cobro habilitado sin importar los permisos. */
const ALWAYS_CAN_COLLECT = new Set(['owner', 'admin', 'manager', 'receptionist']);

const DEFAULT_PERMS: Omit<MyPermissions, 'loading' | 'role'> = {
  can_create_tickets: true,
  can_edit_tickets: true,
  can_delete_tickets: false,
  can_view_reports: false,
  can_manage_inventory: true,
  can_manage_customers: true,
  can_manage_settings: false,
  can_create_invoices: true,
  can_view_all_tickets: true,
  can_manage_pos: true,
  can_manage_expenses: false,
  can_export_data: false,
  can_collect_payment: true,
  can_open_drawer: true,
};

function bool(v: unknown, fallback: boolean): boolean {
  if (typeof v === 'boolean') return v;
  return fallback;
}

export function useMyPermissions(): MyPermissions {
  const [perms, setPerms] = useState<MyPermissions>({
    ...DEFAULT_PERMS,
    role: 'owner',
    loading: true,
  });

  useEffect(() => {
    const supabase = createClient();

    const resolve = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setPerms({ ...DEFAULT_PERMS, role: 'owner', loading: false });
          return;
        }

        const orgId = await getActiveOrganizationId(supabase);

        if (!orgId) {
          // Usuario sin org → propietario de su propio taller, acceso total
          setPerms({ ...DEFAULT_PERMS, role: 'owner', loading: false });
          return;
        }

        // Verificar si es owner de la org
        const { data: orgRow } = await (supabase as any)
          .from('organizations')
          .select('owner_id')
          .eq('id', orgId)
          .maybeSingle();

        if (orgRow?.owner_id === user.id) {
          setPerms({ ...DEFAULT_PERMS, role: 'owner', loading: false });
          return;
        }

        // Leer registro de miembro
        const { data: memberRow } = await (supabase as any)
          .from('organization_members')
          .select('role, permissions')
          .eq('organization_id', orgId)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (!memberRow) {
          // Sin registro → acceso como propietario independiente
          setPerms({ ...DEFAULT_PERMS, role: 'owner', loading: false });
          return;
        }

        const role: string = memberRow.role ?? 'technician';
        const p = (memberRow.permissions ?? {}) as Record<string, unknown>;

        // Los roles privilegiados siempre pueden cobrar aunque no esté en permissions
        const alwaysCollect = ALWAYS_CAN_COLLECT.has(role);

        setPerms({
          role,
          loading: false,
          can_create_tickets:   bool(p.can_create_tickets, DEFAULT_PERMS.can_create_tickets),
          can_edit_tickets:     bool(p.can_edit_tickets, DEFAULT_PERMS.can_edit_tickets),
          can_delete_tickets:   bool(p.can_delete_tickets, DEFAULT_PERMS.can_delete_tickets),
          can_view_reports:     bool(p.can_view_reports, DEFAULT_PERMS.can_view_reports),
          can_manage_inventory: bool(p.can_manage_inventory, DEFAULT_PERMS.can_manage_inventory),
          can_manage_customers: bool(p.can_manage_customers, DEFAULT_PERMS.can_manage_customers),
          can_manage_settings:  bool(p.can_manage_settings, DEFAULT_PERMS.can_manage_settings),
          can_create_invoices:  bool(p.can_create_invoices, DEFAULT_PERMS.can_create_invoices),
          can_view_all_tickets: bool(p.can_view_all_tickets, DEFAULT_PERMS.can_view_all_tickets),
          can_manage_pos:       bool(p.can_manage_pos, DEFAULT_PERMS.can_manage_pos),
          can_manage_expenses:  bool(p.can_manage_expenses, DEFAULT_PERMS.can_manage_expenses),
          can_export_data:      bool(p.can_export_data, DEFAULT_PERMS.can_export_data),
          can_collect_payment:  alwaysCollect || bool(p.can_collect_payment, false),
          can_open_drawer:      alwaysCollect || bool(p.can_open_drawer, false),
        });
      } catch (e) {
        console.warn('[useMyPermissions]', e);
        setPerms({ ...DEFAULT_PERMS, role: 'owner', loading: false });
      }
    };

    void resolve();
  }, []);

  return perms;
}

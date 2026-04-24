import type { SupabaseClient } from '@supabase/supabase-js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(s: string): boolean {
  return UUID_RE.test(s);
}

/** Muestra nombre de técnico si assigned_to guarda id UUID; si no, el texto legado (nombre). */
export function formatAssignedToLabel(
  assignedTo: string | null | undefined,
  idToName: Map<string, string>
): string {
  if (!assignedTo) return '';
  if (isUuid(assignedTo)) return idToName.get(assignedTo) || 'Técnico';
  return assignedTo;
}

/**
 * Mapa id de fila `technicians` → nombre para etiquetas «Asignado a».
 * Sin filtro is_active (tickets antiguos pueden referir técnicos desactivados).
 * Si falta algún id (p. ej. `organization_id` NULL en el técnico), reintenta `.in('id', …)`.
 */
export async function loadTechnicianIdToNameMap(
  supabase: SupabaseClient,
  args: {
    organizationId: string | null | undefined;
    currentUserId: string;
    /** assigned_to u otros UUID de técnicos que deben resolverse sí o sí */
    ensureIds?: Iterable<string | null | undefined>;
  }
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const orgId = args.organizationId;
  const uid = args.currentUserId;

  const techFilter =
    orgId != null && String(orgId).trim() !== ''
      ? `organization_id.eq.${orgId},shop_owner_id.eq.${uid}`
      : `shop_owner_id.eq.${uid}`;

  const { data: techs } = await (supabase as any)
    .from('technicians')
    .select('id, name')
    .or(techFilter);

  for (const t of techs || []) {
    if (t?.id != null && t.name != null) {
      const n = String(t.name).trim();
      map.set(t.id, n || 'Técnico');
    }
  }

  const want = Array.from(args.ensureIds || []).filter(
    (id): id is string => Boolean(id && typeof id === 'string' && isUuid(id))
  );
  const missing = want.filter((id) => !map.has(id));
  if (missing.length === 0) return map;

  const { data: extra } = await (supabase as any)
    .from('technicians')
    .select('id, name')
    .in('id', missing);

  for (const t of extra || []) {
    if (t?.id != null && t.name != null) {
      const n = String(t.name).trim();
      map.set(t.id, n || 'Técnico');
    }
  }

  return map;
}

type TechnicianRow = {
  id: string;
  panel_user_id: string | null;
  name: string | null;
  email: string | null;
  role?: string | null;
};

/**
 * Al asignar un ticket: una notificación en la campana solo para el usuario del panel del técnico
 * (`panel_user_id`, o misma cuenta que su email en la organización vía RPC en BD).
 * Ejecuta `create_ticket_assignment_notifications` (SECURITY DEFINER).
 */
export async function notifyTicketAssignedToPanelUser(
  supabase: SupabaseClient,
  args: {
    organizationId: string;
    ticketId: string;
    ticketNumber: string;
    deviceSummary: string;
    technicianId: string;
  }
): Promise<{ assigneeNotified: boolean; teamNotified: number }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { assigneeNotified: false, teamNotified: 0 };

  const { data, error } = await (supabase as any).rpc('create_ticket_assignment_notifications', {
    p_organization_id: args.organizationId,
    p_ticket_id: args.ticketId,
    p_ticket_number: args.ticketNumber ?? '',
    p_device_summary: args.deviceSummary ?? '',
    p_technician_ref: args.technicianId,
  });

  if (error) {
    console.warn('create_ticket_assignment_notifications:', error.message, error);
    return { assigneeNotified: false, teamNotified: 0 };
  }

  const payload = (data || {}) as {
    assignee_notified?: boolean;
    team_notified?: number;
    error?: string | null;
  };

  if (payload.error && payload.error !== null) {
    console.warn('create_ticket_assignment_notifications result:', payload.error);
  }

  return {
    assigneeNotified: !!payload.assignee_notified,
    teamNotified: Number(payload.team_notified) || 0,
  };
}

/** Estados que cuentan como “reparado” para avisar a recepción (lista de tickets usa `completed`, ficha usa `reparado`). */
export function isRepairedStatusForReceptionNotify(status: string): boolean {
  const s = (status || '').trim().toLowerCase();
  return s === 'reparado' || s === 'completed';
}

/**
 * Aviso a recepcionistas cuando un ticket queda listo: deben avisar al cliente.
 * Destinatarios:
 * - Miembros de la org con rol recepción / gestión (`receptionist`, `admin`, `manager`, `owner`).
 * - Filas en `technicians` con role receptionist y usuario resuelto vía `panel_user_id` o RPC por email.
 */
export async function notifyReceptionistsTicketRepaired(
  supabase: SupabaseClient,
  args: {
    organizationId: string;
    ticketId: string;
    ticketNumber: string;
    deviceSummary: string;
    changedByLabel: string;
  }
): Promise<void> {
  const seenUser = new Set<string>();
  const notifRows: Array<{
    organization_id: string;
    user_id: string;
    kind: string;
    title: string;
    body: string;
    ticket_id: string;
  }> = [];

  const bodyPartsBase = [
    args.ticketNumber && `Ticket ${args.ticketNumber}`,
    args.deviceSummary,
    `Marcado por ${args.changedByLabel}`,
  ].filter(Boolean);
  const defaultBody =
    bodyPartsBase.join(' · ') || 'Un equipo está listo para recogida o aviso al cliente.';

  const pushForUser = (targetUserId: string | null | undefined) => {
    if (!targetUserId || seenUser.has(targetUserId)) return;
    seenUser.add(targetUserId);
    notifRows.push({
      organization_id: args.organizationId,
      user_id: targetUserId,
      kind: 'ticket_repaired_reception',
      title: 'Equipo reparado — avisar al cliente',
      body: defaultBody,
      ticket_id: args.ticketId,
    });
  };

  const { data: orgReceptionists, error: omErr } = await (supabase as any)
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', args.organizationId)
    .eq('is_active', true)
    .in('role', ['receptionist', 'admin', 'manager', 'owner']);

  if (omErr) {
    console.warn('notifyReceptionistsTicketRepaired organization_members:', omErr.message);
  }
  for (const row of orgReceptionists || []) {
    pushForUser((row as { user_id: string }).user_id);
  }

  const { data: techs, error: techErr } = await (supabase as any)
    .from('technicians')
    .select('id, name, email, panel_user_id, role')
    .eq('organization_id', args.organizationId)
    .eq('is_active', true);

  if (techErr) {
    console.warn('notifyReceptionistsTicketRepaired technicians:', techErr.message);
  } else {
    const receptionists = ((techs || []) as TechnicianRow[]).filter(
      (t) => (t.role || '').toLowerCase().trim() === 'receptionist'
    );
    for (const t of receptionists) {
      let targetUserId: string | null = t.panel_user_id || null;
      if (!targetUserId) {
        const { data: rpcId, error: rpcError } = await (supabase as any).rpc(
          'get_panel_user_for_technician_assignment',
          {
            p_technician_id: t.id,
            p_organization_id: args.organizationId,
          }
        );
        if (!rpcError && rpcId) targetUserId = rpcId as string;
      }
      pushForUser(targetUserId);
    }
  }

  if (notifRows.length === 0) return;

  const { error: insErr } = await (supabase as any).from('panel_notifications').insert(notifRows);
  if (insErr) console.warn('panel_notifications ticket_repaired:', insErr.message);
}

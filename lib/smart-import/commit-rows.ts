import { createClient } from '@supabase/supabase-js';
import type { SmartImportMode } from '@/lib/smart-import/constants';
import type { ColumnMapping } from '@/lib/smart-import/apply-mapping';
import { canonicalizeColumnMapping, rowToMappedFields } from '@/lib/smart-import/apply-mapping';
import { validateImportRows } from '@/lib/smart-import/validate-rows';
import { namesCompatibleForPhoneDedup, normalizeEmail, phoneDigits } from '@/lib/smart-import/normalize';
import { normalizeCategory, normalizePriority, normalizeStatus, parseCost } from '@/lib/smart-import/mappers';
import { fetchTicketRepairsSettingsForOrg } from '@/lib/fetch-ticket-repairs-settings-org';
import { reserveNextBoletoTicketNumber } from '@/lib/boleto-ticket-number';
import { isTicketBrandInCategory } from '@/lib/repair-service-device-catalog';

function createUserSupabase(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function ticketBrandFromRaw(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  return t.replace(/\s+/g, '_').toUpperCase();
}

type CustRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  id_number: string | null;
  address: string | null;
  city: string | null;
  organization: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
};

/** Varias filas pueden compartir el mismo teléfono (taller); guardamos todos los ids por dígitos. */
function addPhoneIndex(byPhone: Map<string, string[]>, digits: string, customerId: string) {
  if (digits.length < 6) return;
  const list = byPhone.get(digits) ?? [];
  if (!list.includes(customerId)) list.push(customerId);
  byPhone.set(digits, list);
}

function findCustomerIdByPhoneAndName(
  byPhone: Map<string, string[]>,
  customerById: Map<string, CustRow>,
  digits: string,
  importName: string
): string | undefined {
  if (digits.length < 6) return undefined;
  const ids = byPhone.get(digits);
  if (!ids?.length) return undefined;
  for (const id of ids) {
    const row = customerById.get(id);
    if (!row) continue;
    if (namesCompatibleForPhoneDedup(importName, row.name ?? '')) return id;
  }
  return undefined;
}

export type CommitSummary = {
  customersCreated: number;
  customersReused: number;
  ticketsCreated: number;
  /** Filas del JSON enviadas a importar (tras omitir vacías en el análisis). */
  rowsProcessed: number;
  /** IDs de cliente distintos que recibieron al menos una fila (si es menor que rowsProcessed, hubo colisión por email o teléfono+nombre). */
  distinctCustomersInImport: number;
  rowErrors: { rowIndex: number; message: string }[];
};

export async function commitSmartImport(params: {
  accessToken: string;
  userId: string;
  organizationId: string;
  mode: SmartImportMode;
  headers: string[];
  rows: string[][];
  mapping: ColumnMapping;
}): Promise<{ ok: true; summary: CommitSummary } | { ok: false; message: string }> {
  const { accessToken, userId, organizationId, mode, headers, rows, mapping: mappingRaw } = params;
  const mapping = canonicalizeColumnMapping(headers, mappingRaw);

  const preview = validateImportRows(headers, rows, mapping, mode);
  const bad = preview.find((p) => !p.ok);
  if (bad) {
    return {
      ok: false,
      message: `Fila ${bad.rowIndex}: ${bad.errors.join(' ')}`,
    };
  }

  const sb = createUserSupabase(accessToken);
  const ticketSettings = await fetchTicketRepairsSettingsForOrg(sb, organizationId);
  const ticketStyle = ticketSettings.ticket_number_style ?? 'padded_four';

  const { data: custRows, error: custErr } = await sb
    .from('customers')
    .select('id,name,email,phone,id_number,address,city,organization,state,postal_code,country')
    .eq('organization_id', organizationId)
    .limit(25000);

  if (custErr) {
    return { ok: false, message: custErr.message || 'No se pudieron leer clientes existentes.' };
  }

  const byEmail = new Map<string, string>();
  const byPhone = new Map<string, string[]>();
  const byDoc = new Map<string, string>();
  const customerById = new Map<string, CustRow>();

  for (const c of custRows ?? []) {
    const row = c as CustRow;
    customerById.set(row.id, row);
    const em = normalizeEmail(row.email);
    if (em) byEmail.set(em, row.id);
    const pd = phoneDigits(row.phone);
    addPhoneIndex(byPhone, pd, row.id);
    const doc = row.id_number?.trim().toLowerCase();
    if (doc) byDoc.set(doc, row.id);
  }

  const { data: ticketNumsRows, error: tnErr } = await sb
    .from('repair_tickets')
    .select('ticket_number')
    .eq('organization_id', organizationId)
    .limit(50000);

  if (tnErr) {
    return { ok: false, message: tnErr.message || 'No se pudieron leer boletos existentes.' };
  }

  const usedTicketNumbers = new Set((ticketNumsRows ?? []).map((r: { ticket_number: string }) => r.ticket_number));

  const summary: CommitSummary = {
    customersCreated: 0,
    customersReused: 0,
    ticketsCreated: 0,
    rowsProcessed: rows.length,
    distinctCustomersInImport: 0,
    rowErrors: [],
  };

  const distinctCustomerIdsTouched = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const f = rowToMappedFields(headers, row, mapping);
    const name = (f.customer_name ?? '').trim();
    const email = normalizeEmail(f.customer_email);
    const phone = phoneDigits(f.customer_phone);
    const idDoc = (f.customer_id_number ?? '').trim().toLowerCase();

    let customerId: string | undefined =
      (email && byEmail.get(email)) ||
      (idDoc ? byDoc.get(idDoc) : undefined) ||
      findCustomerIdByPhoneAndName(byPhone, customerById, phone, name);

    if (!customerId) {
      const ins = await sb
        .from('customers')
        .insert([
          {
            user_id: userId,
            organization_id: organizationId,
            name,
            email: email || null,
            phone: (f.customer_phone ?? '').trim() || null,
            organization: (f.customer_organization ?? '').trim() || null,
            address: (f.customer_address ?? '').trim() || null,
            city: (f.customer_city ?? '').trim() || null,
            state: (f.customer_state ?? '').trim() || null,
            postal_code: (f.customer_postal_code ?? '').trim() || null,
            country: (f.customer_country ?? '').trim() || null,
            id_number: (f.customer_id_number ?? '').trim() || null,
            notes: (f.customer_notes ?? '').trim() || null,
            customer_group: 'Particular',
            mailchimp_status: 'No suscrito',
            gdpr_consent: true,
            email_notifications: true,
          },
        ])
        .select('id')
        .single();

      if (ins.error || !ins.data) {
        summary.rowErrors.push({
          rowIndex: i + 1,
          message: ins.error?.message || 'Error al crear cliente',
        });
        continue;
      }

      customerId = (ins.data as { id: string }).id;
      summary.customersCreated += 1;
      distinctCustomerIdsTouched.add(customerId);
      customerById.set(customerId, {
        id: customerId,
        name,
        email: email || null,
        phone: (f.customer_phone ?? '').trim() || null,
        id_number: (f.customer_id_number ?? '').trim() || null,
        address: (f.customer_address ?? '').trim() || null,
        city: (f.customer_city ?? '').trim() || null,
        organization: (f.customer_organization ?? '').trim() || null,
        state: (f.customer_state ?? '').trim() || null,
        postal_code: (f.customer_postal_code ?? '').trim() || null,
        country: (f.customer_country ?? '').trim() || null,
      });
      if (email) byEmail.set(email, customerId);
      addPhoneIndex(byPhone, phone, customerId);
      if (idDoc) byDoc.set(idDoc, customerId);
    } else {
      summary.customersReused += 1;
      if (customerId) distinctCustomerIdsTouched.add(customerId);
      const cached = customerId ? customerById.get(customerId) : undefined;
      const phoneRaw = (f.customer_phone ?? '').trim();
      const patch: Partial<CustRow> = {};
      if (phoneRaw && !(cached?.phone ?? '').trim()) patch.phone = phoneRaw;
      const addrRaw = (f.customer_address ?? '').trim();
      if (addrRaw && !(cached?.address ?? '').trim()) patch.address = addrRaw;
      const cityRaw = (f.customer_city ?? '').trim();
      if (cityRaw && !(cached?.city ?? '').trim()) patch.city = cityRaw;
      const docRaw = (f.customer_id_number ?? '').trim();
      if (docRaw && !(cached?.id_number ?? '').trim()) patch.id_number = docRaw;
      const orgRaw = (f.customer_organization ?? '').trim();
      if (orgRaw && !(cached?.organization ?? '').trim()) patch.organization = orgRaw;
      const stateRaw = (f.customer_state ?? '').trim();
      if (stateRaw && !(cached?.state ?? '').trim()) patch.state = stateRaw;
      const pcRaw = (f.customer_postal_code ?? '').trim();
      if (pcRaw && !(cached?.postal_code ?? '').trim()) patch.postal_code = pcRaw;
      const countryRaw = (f.customer_country ?? '').trim();
      if (countryRaw && !(cached?.country ?? '').trim()) patch.country = countryRaw;
      if (customerId && Object.keys(patch).length) {
        const u = await sb
          .from('customers')
          .update(patch)
          .eq('id', customerId)
          .select('id,name,email,phone,id_number,address,city,organization,state,postal_code,country')
          .single();
        if (!u.error && u.data) {
          customerById.set(customerId, u.data as CustRow);
          const pdNew = phoneDigits((u.data as CustRow).phone);
          addPhoneIndex(byPhone, pdNew, customerId);
        }
      }
    }

    if (mode !== 'customers_and_tickets' || !customerId) continue;

    const issue = (f.issue_description ?? '').trim();
    if (!issue) continue;

    let ticketNumber: string;
    const legacyRaw = (f.ticket_number ?? '').trim();
    if (legacyRaw && !usedTicketNumbers.has(legacyRaw)) {
      ticketNumber = legacyRaw;
    } else {
      try {
        ticketNumber = await reserveNextBoletoTicketNumber(sb, organizationId, ticketStyle);
      } catch (e: any) {
        summary.rowErrors.push({
          rowIndex: i + 1,
          message: e?.message || 'No se pudo generar número de boleto',
        });
        continue;
      }
    }
    usedTicketNumbers.add(ticketNumber);

    const catKey = normalizeCategory(f.device_category ?? '');
    let brandVal = ticketBrandFromRaw(f.device_brand ?? '');
    if (brandVal && catKey && !isTicketBrandInCategory(brandVal, catKey)) {
      brandVal = 'OTRO';
    }

    const est = parseCost((f.estimated_cost ?? '').trim());
    const fin = parseCost((f.final_cost ?? '').trim());

    const deviceType = (f.device_type ?? '').trim() || 'Equipo';
    const screenInches =
      catKey === 'SMART_TV' ? (f.device_screen_inches ?? '').trim() || null : null;

    const ticketPayload = {
      user_id: userId,
      organization_id: organizationId,
      customer_id: customerId,
      ticket_number: ticketNumber,
      device_type: deviceType,
      device_brand: brandVal || null,
      device_model: (f.device_model ?? '').trim() || null,
      device_category: catKey,
      device_screen_inches: screenInches,
      serial_number: (f.serial_number ?? '').trim() || null,
      imei: (f.imei ?? '').trim() || null,
      issue_description: issue,
      status: normalizeStatus(f.status ?? ''),
      priority: normalizePriority(f.priority ?? ''),
      task_type: (f.task_type ?? '').trim() || 'TIENDA',
      estimated_cost: est,
      final_cost: fin,
      notes: (f.notes ?? '').trim() || null,
      diagnostic_notes: (f.diagnostic_notes ?? '').trim() || null,
      is_urgent: false,
      is_draft: false,
    };

    const tIns = await sb.from('repair_tickets').insert([ticketPayload]).select('id').single();
    if (tIns.error) {
      summary.rowErrors.push({
        rowIndex: i + 1,
        message: tIns.error.message || 'Error al crear ticket',
      });
      continue;
    }
    summary.ticketsCreated += 1;
  }

  summary.distinctCustomersInImport = distinctCustomerIdsTouched.size;

  return { ok: true, summary };
}

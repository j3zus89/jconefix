import type { SmartImportMode } from '@/lib/smart-import/constants';
import type { ColumnMapping } from '@/lib/smart-import/apply-mapping';
import { canonicalizeColumnMapping, rowToMappedFields } from '@/lib/smart-import/apply-mapping';
import { normalizeEmail, phoneDigits } from '@/lib/smart-import/normalize';
import { normalizeCategory, parseCost } from '@/lib/smart-import/mappers';

export type PreviewRowResult = {
  rowIndex: number;
  ok: boolean;
  errors: string[];
  warnings: string[];
  /** Resumen de lo que se haría */
  summary: string;
};

export function validateImportRows(
  headers: string[],
  rows: string[][],
  mappingIn: ColumnMapping,
  mode: SmartImportMode
): PreviewRowResult[] {
  const mapping = canonicalizeColumnMapping(headers, mappingIn);
  return rows.map((row, i) => {
    const f = rowToMappedFields(headers, row, mapping);
    const errors: string[] = [];
    const warnings: string[] = [];

    const name = (f.customer_name ?? '').trim();
    if (!name) errors.push('Falta el nombre del cliente.');

    const email = normalizeEmail(f.customer_email);
    const rawPhone = (f.customer_phone ?? '').trim();
    const phone = phoneDigits(f.customer_phone);

    if (rawPhone && !phone) {
      warnings.push(
        'El teléfono de esta fila no tiene dígitos reconocibles; revisá el formato en el Excel o la columna mapeada.'
      );
    }

    let summary = name ? `Cliente: ${name}` : 'Cliente: (sin nombre)';
    if (email) summary += ` · ${email}`;
    if (phone) summary += ` · ${phone}`;
    else if (rawPhone) summary += ` · Tel: ${rawPhone.slice(0, 28)}${rawPhone.length > 28 ? '…' : ''}`;
    const org = (f.customer_organization ?? '').trim();
    if (org) summary += ` · ${org.slice(0, 32)}${org.length > 32 ? '…' : ''}`;
    const city = (f.customer_city ?? '').trim();
    const prov = (f.customer_state ?? '').trim();
    if (city || prov) summary += ` · ${[city, prov].filter(Boolean).join(', ')}`;

    if (mode === 'customers_and_tickets') {
      const issue = (f.issue_description ?? '').trim();
      const hasTicketColumnsHint =
        !!(f.ticket_number ?? '').trim() ||
        !!(f.device_model ?? '').trim() ||
        !!(f.device_brand ?? '').trim() ||
        !!(f.serial_number ?? '').trim() ||
        !!(f.imei ?? '').trim();

      if (hasTicketColumnsHint && !issue) {
        errors.push('Hay datos del boleto pero falta la descripción del problema.');
      }

      if (issue) {
        const legNo = (f.ticket_number ?? '').trim();
        if (legNo) summary += ` · N.º hist.: ${legNo.slice(0, 24)}${legNo.length > 24 ? '…' : ''}`;
        const brand = (f.device_brand ?? '').trim();
        const model = (f.device_model ?? '').trim();
        const devBits = [brand, model].filter(Boolean).join(' ');
        if (devBits) summary += ` · Equipo: ${devBits.slice(0, 40)}${devBits.length > 40 ? '…' : ''}`;
        summary += ` · Trabajo: ${issue.slice(0, 56)}${issue.length > 56 ? '…' : ''}`;

        const cat = (f.device_category ?? '').trim();
        if (cat && !normalizeCategory(cat)) {
          warnings.push(`Categoría «${cat}» no reconocida; se omitirá.`);
        }

        for (const [label, raw] of [
          ['Costo estimado', f.estimated_cost],
          ['Costo final', f.final_cost],
        ] as const) {
          const rawStr = (raw ?? '').trim();
          if (rawStr && parseCost(rawStr) == null) warnings.push(`${label} no numérico; se ignorará.`);
        }
      } else if (!hasTicketColumnsHint) {
        summary += ' · Sin orden en esta fila (solo cliente)';
      }
    }

    return {
      rowIndex: i + 1,
      ok: errors.length === 0,
      errors,
      warnings,
      summary,
    };
  });
}

/**
 * Ajustes «Entradas y reparaciones» en shop_settings.ticket_repairs_settings (jsonb).
 * Los campos existentes se conservan; se añaden claves nuevas con valores por defecto seguros.
 */

export type TicketsAdminInitialView = 'list' | 'calendar';
export type TicketsListInitialFilter = 'today' | 'overdue' | 'all_active';
export type TicketsDefaultDateField = 'created_at' | 'appointment';
export type TicketsPerPage = 10 | 25 | 50 | 100;
export type TicketsDefaultSort = 'date_status' | 'date_only' | 'status_only' | 'due_date';
export type TicketLabelTemplateId = 'default' | 'professional' | 'long_queue' | 'compact';

export type DefaultTicketAssignment = 'default' | 'round_robin' | 'creator' | 'unassigned';
export type WarrantyTimeUnit = 'days' | 'weeks' | 'months' | 'years';
export type DueOffsetUnit = 'minutes' | 'hours' | 'days';
export type EntryIdentifierDefault = 'imei' | 'serial' | 'either' | 'none';

/** Cómo se formatea el número guardado en repair_tickets.ticket_number al crear (RPC next_boleto_ticket_number). */
export type TicketNumberStyle = 'padded_four' | 'minimal';

export const TICKET_NUMBER_STYLE_OPTIONS: {
  id: TicketNumberStyle;
  label: string;
  example: string;
}[] = [
  {
    id: 'padded_four',
    label: 'Cuatro cifras con ceros (predeterminado)',
    example: 'Ej.: 0-0001, 0-0002 … (hasta 0-9999; luego 0-10000, etc.)',
  },
  {
    id: 'minimal',
    label: 'Solo dígitos necesarios',
    example: 'Ej.: 0-1, 0-2, 0-2248 (sin ceros a la izquierda en el número)',
  },
];

export const DEFAULT_AI_DIAGNOSTIC_PROMPT = `Convert the job information below into a structured repair report using bullet points and relevant icons.

Requirements:
- Use clear section headings. (no formatting)
- Format all content in bullet points (no paragraphs).
- Expand diagnostic notes with realistic technical detail (as written by an experienced technician).
- Use concise but professional technician-style language.
- Avoid fluff or customer-facing tone — this should sound internal and technical.
- Include observations, test results, and risks where applicable.
- Keep it structured and easy to scan.
- Keep it short
- Do not include any special symbols like *** & ###`;

export const DEFAULT_AI_PRIVATE_PROMPT = `Rewrite the following repair update as Private Notes for internal technician use.

Requirements:
- Use bullet points only (no paragraphs).
- Add relevant icons for each section.
- Write in a realistic technician tone: direct, diagnostic, and internal.
- Include extra technical detail that would help the next tech continue the job.
- Mention risks, quirks, and things to avoid.
- Do NOT make it customer-friendly — these notes are internal only.
- Highlight blockers, pending parts, and follow-up actions clearly.`;

export type TicketRepairsSettings = {
  /** Interfaz — listados / ficha */
  show_inventory_section: boolean;
  show_closed_cancelled_in_list: boolean;
  show_empty_tickets_in_list: boolean;
  show_parts_column_in_list: boolean;
  /** Reglas generales entradas */
  allow_edit_closed_tickets: boolean;
  allow_delete_ticket_after_invoice: boolean;
  allow_edit_ticket_after_invoice: boolean;
  auto_close_ticket_on_final_invoice: boolean;
  all_staff_see_all_tickets: boolean;
  require_repair_stopwatch_to_close: boolean;
  /** Cronómetro — ids custom_ticket_statuses */
  timer_auto_start_status_ids: string[];
  timer_auto_stop_status_ids: string[];
  /** Opciones flujo entradas */
  allow_estimates_for_entries: boolean;
  auto_status_on_customer_email_sms: boolean;
  copy_notes_to_warranty_ticket: boolean;
  clear_device_access_on_ticket_close: boolean;
  /** Listado administrar tickets */
  tickets_admin_initial_view: TicketsAdminInitialView;
  tickets_list_initial_filter: TicketsListInitialFilter;
  tickets_default_date_field: TicketsDefaultDateField;
  tickets_per_page: TicketsPerPage;
  tickets_default_sort: TicketsDefaultSort;
  estimate_send_change_status_enabled: boolean;
  estimate_send_target_status_id: string | null;
  label_template: TicketLabelTemplateId;
  /** Reparaciones — flujo */
  require_device_check_pre_repair: boolean;
  require_device_check_post_repair: boolean;
  require_parts_entry: boolean;
  require_customer_info: boolean;
  require_diagnostic_notes: boolean;
  require_imei_or_serial: boolean;
  default_ticket_assignment: DefaultTicketAssignment;
  repair_detail_separate_line_items: boolean;
  /** Reparaciones — predeterminados */
  default_warranty_amount: number;
  default_warranty_unit: WarrantyTimeUnit;
  default_entry_identifier: EntryIdentifierDefault;
  due_date_from_avg_repair_time: boolean;
  default_due_offset_amount: number;
  default_due_offset_unit: DueOffsetUnit;
  service_price_retail_plus_charges: boolean;
  /** Avanzado */
  include_customer_group_prices_in_import_export: boolean;
  ai_refine_diagnostic_notes: boolean;
  ai_refine_private_comments: boolean;
  ai_diagnostic_notes_prompt: string;
  ai_private_comments_prompt: string;
  /** Numeración al crear ticket (ver RPC next_boleto_ticket_number). */
  ticket_number_style: TicketNumberStyle;
};

export const DEFAULT_TICKET_REPAIRS_SETTINGS: TicketRepairsSettings = {
  show_inventory_section: true,
  show_closed_cancelled_in_list: true,
  show_empty_tickets_in_list: true,
  show_parts_column_in_list: true,
  allow_edit_closed_tickets: true,
  allow_delete_ticket_after_invoice: true,
  allow_edit_ticket_after_invoice: true,
  auto_close_ticket_on_final_invoice: false,
  all_staff_see_all_tickets: true,
  require_repair_stopwatch_to_close: false,
  timer_auto_start_status_ids: [],
  timer_auto_stop_status_ids: [],
  allow_estimates_for_entries: true,
  auto_status_on_customer_email_sms: false,
  copy_notes_to_warranty_ticket: false,
  clear_device_access_on_ticket_close: false,
  tickets_admin_initial_view: 'list',
  tickets_list_initial_filter: 'today',
  tickets_default_date_field: 'created_at',
  tickets_per_page: 25,
  tickets_default_sort: 'date_status',
  estimate_send_change_status_enabled: false,
  estimate_send_target_status_id: null,
  label_template: 'default',
  require_device_check_pre_repair: true,
  require_device_check_post_repair: false,
  require_parts_entry: false,
  require_customer_info: false,
  require_diagnostic_notes: false,
  require_imei_or_serial: false,
  default_ticket_assignment: 'default',
  repair_detail_separate_line_items: false,
  default_warranty_amount: 6,
  default_warranty_unit: 'months',
  default_entry_identifier: 'imei',
  due_date_from_avg_repair_time: false,
  default_due_offset_amount: 0,
  default_due_offset_unit: 'minutes',
  service_price_retail_plus_charges: false,
  include_customer_group_prices_in_import_export: false,
  ai_refine_diagnostic_notes: true,
  ai_refine_private_comments: true,
  ai_diagnostic_notes_prompt: DEFAULT_AI_DIAGNOSTIC_PROMPT,
  ai_private_comments_prompt: DEFAULT_AI_PRIVATE_PROMPT,
  ticket_number_style: 'padded_four',
};

function asBool(v: unknown, d: boolean): boolean {
  return typeof v === 'boolean' ? v : d;
}

function asStrArr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string' && x.length > 0);
}

function asEnum<T extends string>(v: unknown, allowed: readonly T[], d: T): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : d;
}

function asTicketsPerPage(v: unknown, d: TicketsPerPage): TicketsPerPage {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' ? parseInt(v, 10) : NaN;
  const allowed: TicketsPerPage[] = [10, 25, 50, 100];
  return allowed.includes(n as TicketsPerPage) ? (n as TicketsPerPage) : d;
}

function asNum(v: unknown, d: number, min?: number, max?: number): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' ? parseFloat(v) : NaN;
  if (!Number.isFinite(n)) return d;
  let x = n;
  if (min !== undefined) x = Math.max(min, x);
  if (max !== undefined) x = Math.min(max, x);
  return x;
}

function asStr(v: unknown, d: string): string {
  return typeof v === 'string' ? v : d;
}

/** Fusiona JSON almacenado con valores por defecto (compatible con filas antiguas). */
export function parseTicketRepairsSettings(raw: unknown): TicketRepairsSettings {
  const base: TicketRepairsSettings = { ...DEFAULT_TICKET_REPAIRS_SETTINGS };
  if (!raw || typeof raw !== 'object') return base;
  const o = raw as Record<string, unknown>;
  return {
    show_inventory_section: asBool(o.show_inventory_section, base.show_inventory_section),
    show_closed_cancelled_in_list: asBool(
      o.show_closed_cancelled_in_list,
      base.show_closed_cancelled_in_list
    ),
    show_empty_tickets_in_list: asBool(o.show_empty_tickets_in_list, base.show_empty_tickets_in_list),
    show_parts_column_in_list: asBool(o.show_parts_column_in_list, base.show_parts_column_in_list),
    allow_edit_closed_tickets: asBool(o.allow_edit_closed_tickets, base.allow_edit_closed_tickets),
    allow_delete_ticket_after_invoice: asBool(
      o.allow_delete_ticket_after_invoice,
      base.allow_delete_ticket_after_invoice
    ),
    allow_edit_ticket_after_invoice: asBool(
      o.allow_edit_ticket_after_invoice,
      base.allow_edit_ticket_after_invoice
    ),
    auto_close_ticket_on_final_invoice: asBool(
      o.auto_close_ticket_on_final_invoice,
      base.auto_close_ticket_on_final_invoice
    ),
    all_staff_see_all_tickets: asBool(o.all_staff_see_all_tickets, base.all_staff_see_all_tickets),
    require_repair_stopwatch_to_close: asBool(
      o.require_repair_stopwatch_to_close,
      base.require_repair_stopwatch_to_close
    ),
    timer_auto_start_status_ids: asStrArr(o.timer_auto_start_status_ids),
    timer_auto_stop_status_ids: asStrArr(o.timer_auto_stop_status_ids),
    allow_estimates_for_entries: asBool(o.allow_estimates_for_entries, base.allow_estimates_for_entries),
    auto_status_on_customer_email_sms: asBool(
      o.auto_status_on_customer_email_sms,
      base.auto_status_on_customer_email_sms
    ),
    copy_notes_to_warranty_ticket: asBool(
      o.copy_notes_to_warranty_ticket,
      base.copy_notes_to_warranty_ticket
    ),
    clear_device_access_on_ticket_close: asBool(
      o.clear_device_access_on_ticket_close,
      base.clear_device_access_on_ticket_close
    ),
    tickets_admin_initial_view: asEnum(o.tickets_admin_initial_view, ['list', 'calendar'] as const, base.tickets_admin_initial_view),
    tickets_list_initial_filter: asEnum(
      o.tickets_list_initial_filter,
      ['today', 'overdue', 'all_active'] as const,
      base.tickets_list_initial_filter
    ),
    tickets_default_date_field: asEnum(
      o.tickets_default_date_field,
      ['created_at', 'appointment'] as const,
      base.tickets_default_date_field
    ),
    tickets_per_page: asTicketsPerPage(o.tickets_per_page, base.tickets_per_page),
    tickets_default_sort: asEnum(
      o.tickets_default_sort,
      ['date_status', 'date_only', 'status_only', 'due_date'] as const,
      base.tickets_default_sort
    ),
    estimate_send_change_status_enabled: asBool(
      o.estimate_send_change_status_enabled,
      base.estimate_send_change_status_enabled
    ),
    estimate_send_target_status_id:
      typeof o.estimate_send_target_status_id === 'string'
        ? o.estimate_send_target_status_id
        : o.estimate_send_target_status_id === null
          ? null
          : base.estimate_send_target_status_id,
    label_template: asEnum(
      o.label_template,
      ['default', 'professional', 'long_queue', 'compact'] as const,
      base.label_template
    ),
    require_device_check_pre_repair: asBool(
      o.require_device_check_pre_repair,
      base.require_device_check_pre_repair
    ),
    require_device_check_post_repair: asBool(
      o.require_device_check_post_repair,
      base.require_device_check_post_repair
    ),
    require_parts_entry: asBool(o.require_parts_entry, base.require_parts_entry),
    require_customer_info: asBool(o.require_customer_info, base.require_customer_info),
    require_diagnostic_notes: asBool(o.require_diagnostic_notes, base.require_diagnostic_notes),
    require_imei_or_serial: asBool(o.require_imei_or_serial, base.require_imei_or_serial),
    default_ticket_assignment: asEnum(
      o.default_ticket_assignment,
      ['default', 'round_robin', 'creator', 'unassigned'] as const,
      base.default_ticket_assignment
    ),
    repair_detail_separate_line_items: asBool(
      o.repair_detail_separate_line_items,
      base.repair_detail_separate_line_items
    ),
    default_warranty_amount: asNum(o.default_warranty_amount, base.default_warranty_amount, 0, 999),
    default_warranty_unit: asEnum(
      o.default_warranty_unit,
      ['days', 'weeks', 'months', 'years'] as const,
      base.default_warranty_unit
    ),
    default_entry_identifier: asEnum(
      o.default_entry_identifier,
      ['imei', 'serial', 'either', 'none'] as const,
      base.default_entry_identifier
    ),
    due_date_from_avg_repair_time: asBool(
      o.due_date_from_avg_repair_time,
      base.due_date_from_avg_repair_time
    ),
    default_due_offset_amount: asNum(
      o.default_due_offset_amount,
      base.default_due_offset_amount,
      0,
      99999
    ),
    default_due_offset_unit: asEnum(
      o.default_due_offset_unit,
      ['minutes', 'hours', 'days'] as const,
      base.default_due_offset_unit
    ),
    service_price_retail_plus_charges: asBool(
      o.service_price_retail_plus_charges,
      base.service_price_retail_plus_charges
    ),
    include_customer_group_prices_in_import_export: asBool(
      o.include_customer_group_prices_in_import_export,
      base.include_customer_group_prices_in_import_export
    ),
    ai_refine_diagnostic_notes: asBool(o.ai_refine_diagnostic_notes, base.ai_refine_diagnostic_notes),
    ai_refine_private_comments: asBool(o.ai_refine_private_comments, base.ai_refine_private_comments),
    ai_diagnostic_notes_prompt: asStr(o.ai_diagnostic_notes_prompt, base.ai_diagnostic_notes_prompt),
    ai_private_comments_prompt: asStr(o.ai_private_comments_prompt, base.ai_private_comments_prompt),
    ticket_number_style: asEnum(
      o.ticket_number_style,
      ['padded_four', 'minimal'] as const,
      base.ticket_number_style
    ),
  };
}

export const TICKET_LABEL_TEMPLATES: {
  id: TicketLabelTemplateId;
  name: string;
  preview?: string;
}[] = [
  {
    id: 'default',
    name: 'Predeterminada',
    preview:
      'iPhone 12\nCambio de conector de carga\nEntrega: 31 ene, 10:30\nTicket # 01-135\nCliente mostrador',
  },
  { id: 'professional', name: 'Profesional' },
  { id: 'long_queue', name: 'Etiqueta cola larga' },
  { id: 'compact', name: 'Etiqueta de barra' },
];

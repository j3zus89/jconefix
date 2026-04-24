/**
 * Mensajes claros cuando faltan tablas o buckets en Supabase (PostgREST / Storage).
 */

/** PostgREST: columna attachment_url u otras en chat_messages (chat interno / FloatingChat). */
export function humanizeInternalChatMessagesError(raw: string): string {
  const lower = raw.toLowerCase();
  if (!lower.includes('chat_messages')) return raw;
  const likeMissing =
    lower.includes('schema cache') ||
    lower.includes('could not find') ||
    lower.includes('column') ||
    lower.includes('does not exist');
  if (!likeMissing) return raw;

  if (lower.includes('attachment_url')) {
    return (
      'Falta la columna «attachment_url» en «chat_messages» (adjuntos del chat interno). ' +
      'En Supabase → SQL Editor ejecuta `supabase/migrations/202604051700_chat_messages_attachment_url.sql` ' +
      'o `supabase db push`, espera unos segundos y recarga. ' +
      'Los mensajes solo texto pueden funcionar sin migración en versiones recientes del panel.'
    );
  }

  return raw;
}

export function humanizeSupportChatDbError(raw: string): string {
  const lower = raw.toLowerCase();
  const mentionsTable =
    lower.includes('support_chat_messages') ||
    (lower.includes('pgrst') && lower.includes('relation'));

  const missingShape =
    lower.includes('schema cache') ||
    lower.includes('could not find the table') ||
    lower.includes('does not exist') ||
    lower.includes('relation') && lower.includes('does not exist');

  if (mentionsTable && missingShape) {
    return (
      'La tabla «support_chat_messages» no está creada en tu base de datos Supabase (o hace falta refrescar el esquema). ' +
      'Abre Supabase → SQL Editor y ejecuta el archivo del repo `supabase/migrations/202604022200_support_chat_messages.sql`, ' +
      'o en terminal (con CLI): `supabase db push`. Después recarga el panel de admin.'
    );
  }

  return raw;
}

export function humanizeAvatarStorageError(raw: string): string {
  const lower = raw.toLowerCase();
  const likeMissingBucket =
    lower.includes('bucket not found') ||
    (lower.includes('not found') && (lower.includes('bucket') || lower.includes('avatars'))) ||
    lower.includes('the resource was not found') ||
    lower.includes('object not found') ||
    lower.includes('no such bucket') ||
    /status code:\s*404/.test(lower);

  if (likeMissingBucket) {
    return (
      'Falta el bucket de Storage «avatars» en Supabase (o las políticas). ' +
      'En SQL Editor ejecuta `supabase/migrations/202604022105_avatars_storage_and_profile.sql` y ' +
      '`supabase/migrations/202604022310_avatars_storage_select_policy.sql`, o crea manualmente un bucket público llamado `avatars` ' +
      'y aplica las mismas políticas del repo. Luego vuelve a subir la foto.'
    );
  }

  return raw;
}

/** PostgREST: columnas technicians ausentes (empleados / campana). */
export function humanizeTechniciansSchemaError(raw: string): string {
  const lower = raw.toLowerCase();
  const tech =
    lower.includes('technicians') &&
    (lower.includes('schema cache') ||
      lower.includes('could not find') ||
      lower.includes('column') ||
      lower.includes('does not exist'));

  if (!tech) return raw;

  if (lower.includes('panel_user_id')) {
    return (
      'Falta la columna «panel_user_id» en «technicians» (campana / enlace a usuario del panel). ' +
      'En Supabase → SQL Editor ejecuta: ALTER TABLE public.technicians ADD COLUMN IF NOT EXISTS panel_user_id uuid; ' +
      'o el archivo `supabase/migrations/202604022103_panel_notifications.sql` o `supabase/scripts/schema_catchup_panel_completo.sql`. ' +
      'Recarga la página después.'
    );
  }

  if (lower.includes('organization_id')) {
    return (
      'Tu base de datos no tiene la columna «organization_id» en «technicians». ' +
      'En SQL Editor: ALTER TABLE public.technicians ADD COLUMN IF NOT EXISTS organization_id uuid; ' +
      'o `supabase/migrations/202604023100_technicians_ensure_organization_id.sql` / `supabase db push`.'
    );
  }

  return raw;
}

/** PostgREST: columnas shop_settings ausentes (guardar perfil / configuración). */
/** Tabla shop_printer_nodes ausente o no en caché de esquema. */
export function humanizeShopPrinterNodesError(raw: string): string {
  const lower = raw.toLowerCase();
  const hit =
    lower.includes('shop_printer_nodes') ||
    (lower.includes('schema cache') && lower.includes('printer'));
  if (!hit) return raw;
  return (
    'La tabla «shop_printer_nodes» no existe o PostgREST no la ve aún. ' +
    'Ejecuta en Supabase → SQL Editor `supabase/migrations/202604032800_shop_printer_nodes.sql` ' +
    'o `supabase db push`, espera unos segundos y recarga.'
  );
}

export function humanizeShopSettingsSchemaError(raw: string): string {
  const lower = raw.toLowerCase();

  const likeMissingColumn =
    lower.includes('schema cache') ||
    lower.includes('could not find') ||
    lower.includes('column') ||
    lower.includes('does not exist') ||
    lower.includes('pgrst');

  if (lower.includes('ticket_repairs_settings') && likeMissingColumn) {
    return (
      'Falta la columna «ticket_repairs_settings» en «shop_settings» (Tickets y reparaciones). ' +
      'En Supabase → SQL Editor ejecuta `supabase/migrations/202604033200_shop_settings_ticket_repairs_settings.sql` ' +
      'o `supabase db push`. Luego recarga Ajustes.'
    );
  }

  if (lower.includes('panel_ui_mode') && likeMissingColumn) {
    return (
      'Falta la columna «panel_ui_mode» en «shop_settings» (modo de panel sencillo / completo). ' +
      'En Supabase → SQL Editor ejecuta `supabase/migrations/202604061200_shop_settings_panel_ui_mode.sql` ' +
      'o `supabase db push`. Luego recarga Ajustes.'
    );
  }

  if (lower.includes('delay_followup_settings') && likeMissingColumn) {
    return (
      'Falta la columna «delay_followup_settings» en «shop_settings» (avisos de seguimiento por retraso en tickets). ' +
      'En Supabase → SQL Editor ejecuta `supabase/migrations/202604062200_ticket_delay_followup.sql` ' +
      'o `supabase db push`. Luego recarga Ajustes.'
    );
  }

  if (lower.includes('ar_allow_invoice_without_afip') && likeMissingColumn) {
    return (
      'Falta la columna «ar_allow_invoice_without_afip» en «shop_settings» (cobro sin AFIP opcional). ' +
      'En Supabase → SQL Editor ejecuta `supabase/migrations/202604091430_shop_settings_ar_allow_invoice_without_afip.sql` ' +
      'o `supabase db push`. Luego recarga Ajustes.'
    );
  }

  if (lower.includes('portal_') && likeMissingColumn) {
    return (
      'Faltan columnas del portal de cliente en «shop_settings». ' +
      'En Supabase → SQL Editor ejecuta `supabase/migrations/202604033000_shop_settings_portal_cliente.sql` ' +
      'o `supabase db push`. Luego recarga Ajustes.'
    );
  }

  if (
    (lower.includes('smtp_host') ||
      lower.includes('smtp_port') ||
      lower.includes('smtp_user') ||
      lower.includes('smtp_password') ||
      lower.includes('customer_notify_channels')) &&
    likeMissingColumn
  ) {
    return (
      'Faltan columnas de correo (SMTP) o notificaciones en «shop_settings». ' +
      'En Supabase → SQL Editor ejecuta `supabase/migrations/202604032900_shop_settings_smtp_customer_notify.sql` ' +
      'o `supabase db push`. Luego recarga Ajustes.'
    );
  }

  if (
    (lower.includes('customer_tax_id') || lower.includes('customer_billing_address')) &&
    likeMissingColumn
  ) {
    return (
      'Faltan columnas fiscales en «invoices» (customer_tax_id / customer_billing_address). ' +
      'En Supabase → SQL Editor ejecuta `supabase/migrations/202604033600_invoices_customer_billing_fields.sql` ' +
      'o `supabase db push`.'
    );
  }

  if (lower.includes('qz_tray_direct_invoice_print') && likeMissingColumn) {
    return (
      'Falta la columna «qz_tray_direct_invoice_print» en «shop_settings». ' +
      'En Supabase → SQL Editor ejecuta `supabase/migrations/202604033500_shop_settings_qz_tray_direct_invoice.sql` ' +
      'o `supabase db push`. Luego recarga Ajustes.'
    );
  }

  if (lower.includes('qz_tray') && likeMissingColumn) {
    return (
      'Faltan columnas QZ Tray en «shop_settings». ' +
      'En Supabase → SQL Editor ejecuta `supabase/migrations/202604032700_shop_settings_qz_tray.sql` ' +
      'o `supabase db push`. Luego recarga Ajustes.'
    );
  }

  if (lower.includes('security_controls') && likeMissingColumn) {
    return (
      'Falta la columna «security_controls» en «shop_settings» (controles de seguridad / PIN). ' +
      'En Supabase → SQL Editor ejecuta `supabase/migrations/202604032500_shop_settings_security_controls.sql` ' +
      'o en terminal: `supabase db push`. Luego recarga Ajustes.'
    );
  }

  const shop =
    lower.includes('shop_settings') &&
    likeMissingColumn;

  if (!shop) return raw;

  return (
    'Faltan columnas en «shop_settings» (p. ej. accounting_method). ' +
    'En Supabase → SQL Editor ejecuta `supabase/migrations/202604023700_shop_settings_ensure_expanded_columns.sql`. ' +
    'Luego recarga el panel.'
  );
}

/** PostgREST: columna gemini_api_key en organizations (IA por taller). */
export function humanizeOrganizationsSchemaError(raw: string): string {
  const lower = raw.toLowerCase();
  const likeMissingColumn =
    lower.includes('schema cache') ||
    lower.includes('could not find') ||
    lower.includes('column') ||
    lower.includes('does not exist') ||
    lower.includes('pgrst');
  if (lower.includes('gemini_api_key') && likeMissingColumn) {
    return (
      'Falta la columna «gemini_api_key» en «organizations» (IA / Gemini). ' +
      'En Supabase → SQL Editor ejecuta `supabase/migrations/202604033400_organizations_gemini_api_key.sql` ' +
      'o `supabase db push`.'
    );
  }
  if (
    lower.includes('organizations') &&
    likeMissingColumn &&
    (lower.includes('country') || lower.includes('currency') || lower.includes('logo_url'))
  ) {
    return (
      'Faltan columnas de localización o logo en «organizations» (country, currency y/o logo_url). ' +
      'En Supabase → SQL Editor ejecuta `supabase/migrations/202604030200_localization_es_ar.sql` y, si aplica, ' +
      '`202604050002_organizations_add_logo_url.sql`, o `supabase db push`.'
    );
  }
  return raw;
}

/** PostgREST: embed invoices → organizations sin FK en la BD. */
export function humanizeInvoicesOrganizationsRelationshipError(raw: string): string {
  const lower = raw.toLowerCase();
  if (
    lower.includes('relationship') &&
    lower.includes('invoices') &&
    lower.includes('organizations') &&
    (lower.includes('schema cache') || lower.includes('could not find'))
  ) {
    return (
      'Falta la relación (clave foránea) entre «invoices» y «organizations» en Supabase. ' +
      'Ejecuta en SQL Editor `supabase/migrations/202604034100_invoices_organization_id_fkey.sql` ' +
      'o `supabase db push`, espera unos segundos (o recarga el esquema en Ajustes del proyecto) y vuelve a intentar.'
    );
  }
  return raw;
}

/** Tabla «expense_categories» o columna «expenses.organization_id» ausente. */
export function humanizeExpenseCategoriesError(raw: string): string {
  const lower = raw.toLowerCase();
  const hit =
    lower.includes('expense_categories') ||
    (lower.includes('relation') && lower.includes('does not exist') && lower.includes('expense'));
  const likeMissing =
    lower.includes('schema cache') ||
    lower.includes('could not find') ||
    lower.includes('does not exist') ||
    lower.includes('pgrst');
  if (hit || (likeMissing && lower.includes('expense_categor'))) {
    return (
      'La tabla «expense_categories» no existe o falta «organization_id» en «expenses». ' +
      'Ejecuta `supabase/migrations/202604034000_expense_categories.sql` o `supabase db push`.'
    );
  }
  return raw;
}

/** Tabla «user_panel_sessions» ausente (Sesiones activas en Ajustes). */
export function humanizeUserPanelSessionsError(raw: string): string {
  const lower = raw.toLowerCase();
  const hit =
    lower.includes('user_panel_sessions') ||
    (lower.includes('relation') && lower.includes('does not exist') && lower.includes('user_panel'));
  const likeMissing =
    lower.includes('schema cache') ||
    lower.includes('could not find') ||
    lower.includes('does not exist') ||
    lower.includes('pgrst');
  if (hit || (likeMissing && lower.includes('panel_session'))) {
    return (
      'La tabla «user_panel_sessions» no existe o PostgREST no la ve. ' +
      'En Supabase → SQL Editor ejecuta `supabase/migrations/202604033900_user_panel_sessions.sql` ' +
      'o `supabase db push`, espera unos segundos y recarga.'
    );
  }
  return raw;
}

/** PostgREST: columnas repair_tickets (vínculo garantía / devolución al cliente). */
export function humanizeRepairTicketsSchemaError(raw: string): string {
  const lower = raw.toLowerCase();

  if (
    lower.includes('duplicate key') &&
    (lower.includes('repair_tickets_org_ticket_number') || lower.includes('ticket_number_uniq'))
  ) {
    return (
      'Ya existe un boleto con ese número en tu taller (la numeración quedó desfasada, p. ej. tras importar datos). ' +
      'Volvé a pulsar «Crear ticket». Si sigue fallando, en Supabase ejecutá `supabase db push` o el archivo ' +
      '`supabase/migrations/202604121700_next_boleto_avoid_duplicate_org_number.sql` en el SQL Editor y recargá el panel.'
    );
  }

  const hitTable =
    lower.includes('repair_tickets') &&
    (lower.includes('schema cache') ||
      lower.includes('could not find') ||
      lower.includes('column') ||
      lower.includes('does not exist'));

  if (!hitTable) return raw;

  if (lower.includes('related_ticket_id')) {
    return (
      'Falta la columna «related_ticket_id» en «repair_tickets» (vínculo entre tickets / reingreso o garantía). ' +
      'En Supabase → SQL Editor ejecuta `supabase/migrations/202604061500_repair_tickets_related_ticket.sql` ' +
      'o `supabase db push`, espera unos segundos y recarga el panel.'
    );
  }

  if (
    lower.includes('follow_up_wait_reason') ||
    lower.includes('follow_up_snoozed_until') ||
    lower.includes('follow_up_started_at') ||
    lower.includes('follow_up_notify_count') ||
    lower.includes('follow_up_last_notified')
  ) {
    return (
      'Faltan columnas de «seguimiento por retraso» en «repair_tickets» (o «delay_followup_settings» en «shop_settings»). ' +
      'En Supabase → SQL Editor ejecuta `supabase/migrations/202604062200_ticket_delay_followup.sql` ' +
      'o `supabase db push`, espera unos segundos y recarga.'
    );
  }

  if (lower.includes('warranty_start_date') || lower.includes('warranty_end_date')) {
    return (
      'Faltan las columnas de fechas de garantía en «repair_tickets». ' +
      'En Supabase → SQL Editor ejecuta `supabase/migrations/202604062400_repair_tickets_warranty_dates.sql` ' +
      'o `supabase db push`, espera unos segundos y recarga.'
    );
  }

  if (lower.includes('budget_valid_until') || lower.includes('budget_last_reminder_at')) {
    return (
      'Faltan columnas del panel «Presupuestos» en «repair_tickets». ' +
      'Ejecuta `supabase/migrations/202604062510_repair_tickets_estimate_panel.sql` o `supabase db push` y recarga.'
    );
  }

  if (lower.includes('device_screen_inches')) {
    return (
      'Falta la columna «device_screen_inches» en «repair_tickets» (pulgadas de Smart TV). ' +
      'En Supabase → SQL Editor ejecuta `supabase/migrations/202604121600_repair_tickets_device_screen_inches.sql` ' +
      'o `supabase db push`, espera unos segundos y recarga.'
    );
  }

  if (
    lower.includes('return_to_customer_note') ||
    lower.includes('return_to_customer_amount') ||
    lower.includes('return_to_customer_recorded') ||
    lower.includes('return_to_customer_completed') ||
    lower.includes('return_scenario') ||
    lower.includes('return_settlement') ||
    lower.includes('return_related_invoice')
  ) {
    return (
      'Faltan columnas de «devolución al cliente» en «repair_tickets». ' +
      'En Supabase → SQL Editor ejecuta `supabase/migrations/202604061810_repair_tickets_customer_return.sql` ' +
      'y `202604061920_customer_return_constancias.sql`, o `supabase db push`, espera unos segundos y recarga.'
    );
  }

  if (lower.includes('customer_return_constancias')) {
    return (
      'Falta la tabla «customer_return_constancias» (constancias de devolución). ' +
      'Ejecuta `supabase/migrations/202604061920_customer_return_constancias.sql` o `supabase db push`.'
    );
  }

  return raw;
}

-- =============================================================================
-- JC ONE FIX — Puesta al día del esquema (idempotente)
-- =============================================================================
-- Para proyectos donde no se han aplicado todas las migraciones del repo y el
-- panel falla con "column ... not in schema cache" o tablas inexistentes.
--
-- CÓMO USARLO
--   1) Supabase → SQL Editor → pegar este archivo completo → Run.
--   2) En el dashboard de Supabase, si sigue fallando: Project Settings → API
--      → a veces hace falta recargar / esperar ~1 min al caché de PostgREST.
--
-- MEJOR PRÁCTICA (desarrollo local)
--   supabase link --project-ref <tu_ref>
--   supabase db push
--   Así se aplican las migraciones en orden desde supabase/migrations/
--
-- ORDEN DE MIGRACIONES EN EL REPO (referencia)
--   20260330082317_create_repair_desk_schema.sql
--   … (resto en orden por timestamp en el nombre del archivo)
--   20260401001_create_organizations_table.sql
--   20260401002_create_organization_members_table.sql
--   20260401003_add_organization_id_to_existing_tables.sql
--   20260401004_create_default_organization_and_migrate_data.sql
--   20260401005_update_rls_policies_dual_mode.sql
--   20260401006_create_super_admin_system.sql
--   202604021500_products_pos_sales_and_invoices_core.sql  ← POS, products, suppliers…
--   202604021600_invoices_rls_organization.sql
--   202604021710 / 021800 chat interno
--   202604022103_panel_notifications.sql
--   202604022105_avatars_storage_and_profile.sql
--   202604022200_support_chat_messages.sql
--   202604032400_support_chat_attachment_url.sql  ← columna attachment_url + bucket support_chat_uploads
--   202604032500_shop_settings_security_controls.sql  ← security_controls jsonb (PIN por acción / rol)
--   202604032700_shop_settings_qz_tray.sql  ← qz_tray_port, certificado PEM opcional (Bandeja QZ)
--   202604033500_shop_settings_qz_tray_direct_invoice.sql  ← impresión directa facturas QZ (opcional)
--   202604033600_invoices_customer_billing_fields.sql  ← customer_tax_id, customer_billing_address en invoices
--   202604033700_invoices_dashboard_fiscal_es_ar.sql  ← panel facturas, filtros guardados, campos ES/AR (ARCA)
--   202604033900_user_panel_sessions.sql  ← Sesiones activas (Configuración)
--   202604034000_expense_categories.sql  ← categorías de gastos + expenses.organization_id
--   202604034100_invoices_organization_id_fkey.sql  ← FK invoices→organizations (embed PostgREST)
--   202604034200_fix_user_organization_ids_rls_recursion.sql  ← evita recursión RLS organization_members
--   202604034300_drop_legacy_organization_members_policies.sql  ← quita políticas duplicadas recursivas
--   202604034400_audit_fixes_missing_columns.sql  ← columnas y tabla purchase_order_items faltantes
--   202604032800_shop_printer_nodes.sql  ← Nodo de impresión (impresoras por organización)
--   202604032900_shop_settings_smtp_customer_notify.sql  ← SMTP + customer_notify_channels (Correo y WhatsApp)
--   202604033000_shop_settings_portal_cliente.sql  ← portal_enabled, login, notas, presupuesto, facturas
--   202604033100_repair_categories_task_types_payment_methods_unique_name.sql  ← único (user_id, name), dedupe
--   202604033200_shop_settings_ticket_repairs_settings.sql  ← JSON tickets/reparaciones
--   202604033400_organizations_gemini_api_key.sql  ← IA Gemini por organización
--   202604022310_avatars_storage_select_policy.sql
--   202604023100_technicians_ensure_organization_id.sql
--   202604023500_repair_tickets_rls_via_panel_notification.sql  ← abrir ticket desde campana
--   202604023610_chat_messages_retention_7_days.sql  ← purga chat >7 días (función SQL)
--   202604051700_chat_messages_attachment_url.sql  ← chat interno: attachment_url + bucket team_chat_uploads
--   202604061200_shop_settings_panel_ui_mode.sql  ← panel_ui_mode (sencillo / completo)
--   202604023620_next_boleto_ticket_number.sql  ← boletos 0-0001… por taller (RPC)
--   202604023700_shop_settings_ensure_expanded_columns.sql  ← columnas shop_settings (perfil / config)
--   202604024010_notify_reception_on_ticket_repaired_trigger.sql  ← campana al pasar ticket a reparado
--
-- TABLAS QUE EL PANEL TOCA (resumen; deben existir o crearse con migraciones)
--   organizations, organization_members, profiles, customers, repair_tickets,
--   technicians, shop_settings, chat_messages, support_chat_messages,
--   panel_notifications, inventory_items, products, pos_sales, invoices,
--   invoice_items, payments, ticket_*, custom_ticket_statuses, task_types,
--   payment_methods, repair_categories, role_permissions, suppliers,
--   purchase_orders, inventory_transfers, shifts, expenses, commercial_signup_requests …
-- =============================================================================


-- ---------------------------------------------------------------------------
-- A) Multi-tenant: organization_id (nullable, sin romper datos legacy)
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.repair_tickets ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.technicians ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.ticket_statuses ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.shop_settings ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS security_controls jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS qz_tray_port integer NOT NULL DEFAULT 8182;
ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS qz_tray_using_secure boolean NOT NULL DEFAULT false;
ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS qz_tray_certificate_pem text DEFAULT NULL;
ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS qz_tray_certificate_label text DEFAULT NULL;
ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS qz_tray_direct_invoice_print boolean NOT NULL DEFAULT false;

ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS smtp_host text NOT NULL DEFAULT '';
ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS smtp_port integer NOT NULL DEFAULT 587;
ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS smtp_user text NOT NULL DEFAULT '';
ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS smtp_password text NOT NULL DEFAULT '';
ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS customer_notify_channels jsonb NOT NULL DEFAULT
    '{"ticket_created":{"email":true,"whatsapp":false},"status_change":{"email":true,"whatsapp":false},"ready_pickup":{"email":true,"whatsapp":false},"estimate_pending":{"email":true,"whatsapp":false},"invoice_issued":{"email":true,"whatsapp":false}}'::jsonb;

ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS portal_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS portal_require_login boolean NOT NULL DEFAULT false;
ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS portal_show_diagnostic_notes boolean NOT NULL DEFAULT false;
ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS portal_allow_quote_approval boolean NOT NULL DEFAULT false;
ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS portal_show_invoices boolean NOT NULL DEFAULT false;

ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS ticket_repairs_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS panel_ui_mode text NOT NULL DEFAULT 'full';

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS gemini_api_key text;

-- Listas configurables: una fila por (usuario, nombre) — evita doble seed en carreras
DELETE FROM public.repair_categories c1
USING public.repair_categories c2
WHERE c1.user_id IS NOT DISTINCT FROM c2.user_id
  AND c1.name = c2.name
  AND c1.id::text > c2.id::text;
DELETE FROM public.task_types t1
USING public.task_types t2
WHERE t1.user_id IS NOT DISTINCT FROM t2.user_id
  AND t1.name = t2.name
  AND t1.id::text > t2.id::text;
DELETE FROM public.payment_methods p1
USING public.payment_methods p2
WHERE p1.user_id IS NOT DISTINCT FROM p2.user_id
  AND p1.name = p2.name
  AND p1.id::text > p2.id::text;
CREATE UNIQUE INDEX IF NOT EXISTS repair_categories_user_id_name_key
  ON public.repair_categories (user_id, name);
CREATE UNIQUE INDEX IF NOT EXISTS task_types_user_id_name_key
  ON public.task_types (user_id, name);
CREATE UNIQUE INDEX IF NOT EXISTS payment_methods_user_id_name_key
  ON public.payment_methods (user_id, name);

-- Facturas (UI / API multi-org)
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS customer_tax_id text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS customer_billing_address text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS external_reference text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS created_by_user_id uuid;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS refunded_amount numeric(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS billing_jurisdiction text NOT NULL DEFAULT 'ES';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS clone_of_invoice_id uuid;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS customer_signature_url text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS ar_cae text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS ar_cae_expires_at date;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS ar_cbte_tipo integer;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS ar_punto_venta integer;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS ar_numero_cbte bigint;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS ar_cuit_emisor text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS es_verifactu_uuid text;

-- Chat interno por organización
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS organization_id uuid;

CREATE INDEX IF NOT EXISTS idx_profiles_organization_id
  ON public.profiles (organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_organization_id
  ON public.customers (organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_repair_tickets_organization_id
  ON public.repair_tickets (organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_items_organization_id
  ON public.inventory_items (organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_technicians_organization_id
  ON public.technicians (organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ticket_statuses_organization_id
  ON public.ticket_statuses (organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shop_settings_organization_id
  ON public.shop_settings (organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_organization_id
  ON public.invoices (organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS chat_messages_org_created_idx
  ON public.chat_messages (organization_id, created_at DESC);

-- Adjuntos chat interno (migración 202604051700_chat_messages_attachment_url.sql)
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS attachment_url text;

COMMENT ON COLUMN public.chat_messages.attachment_url IS
  'URL pública del adjunto (Storage bucket team_chat_uploads).';

INSERT INTO storage.buckets (id, name, public)
VALUES ('team_chat_uploads', 'team_chat_uploads', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "team_chat_uploads_select_public" ON storage.objects;

CREATE POLICY "team_chat_uploads_select_public"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'team_chat_uploads');


-- ---------------------------------------------------------------------------
-- B) Empleados / notificaciones campana
-- ---------------------------------------------------------------------------
ALTER TABLE public.technicians ADD COLUMN IF NOT EXISTS panel_user_id uuid;


-- ---------------------------------------------------------------------------
-- C) Campana: panel_notifications (+ RLS mínima si la tabla no existía)
--    Requiere public.organizations y public.repair_tickets (ya en migraciones base).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.panel_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'ticket_assigned',
  title text NOT NULL,
  body text,
  ticket_id uuid REFERENCES public.repair_tickets(id) ON DELETE CASCADE,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_panel_notifications_user_created
  ON public.panel_notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_panel_notifications_user_unread
  ON public.panel_notifications (user_id)
  WHERE read_at IS NULL;

ALTER TABLE public.panel_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "panel_notifications_select_own" ON public.panel_notifications;
CREATE POLICY "panel_notifications_select_own"
  ON public.panel_notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "panel_notifications_update_own" ON public.panel_notifications;
CREATE POLICY "panel_notifications_update_own"
  ON public.panel_notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "panel_notifications_insert_for_org_member" ON public.panel_notifications;
CREATE POLICY "panel_notifications_insert_for_org_member"
  ON public.panel_notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    user_belongs_to_org(organization_id)
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = panel_notifications.organization_id
        AND om.user_id = panel_notifications.user_id
        AND om.is_active = true
    )
  );


-- ---------------------------------------------------------------------------
-- D) Contacto apoyo + avatares (mismo bloque que setup_contacto_apoyo_y_avatars.sql)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations (id) ON DELETE SET NULL,
  sender text NOT NULL CHECK (sender IN ('user', 'admin')),
  body text NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 8000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_chat_user_created
  ON public.support_chat_messages (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_chat_org_created
  ON public.support_chat_messages (organization_id, created_at DESC);

ALTER TABLE public.support_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_chat_select_own" ON public.support_chat_messages;
CREATE POLICY "support_chat_select_own"
  ON public.support_chat_messages FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "support_chat_insert_user" ON public.support_chat_messages;
CREATE POLICY "support_chat_insert_user"
  ON public.support_chat_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND sender = 'user');

COMMENT ON TABLE public.support_chat_messages IS 'Chat soporte técnico: filas con user_id del cliente panel; admin inserta con service role (sender admin).';

-- Adjuntos en chat soporte (migración 202604032400_support_chat_attachment_url.sql)
ALTER TABLE public.support_chat_messages
  ADD COLUMN IF NOT EXISTS attachment_url text;

COMMENT ON COLUMN public.support_chat_messages.attachment_url IS
  'Imagen/archivo en chat soporte; subida con service role.';

INSERT INTO storage.buckets (id, name, public)
VALUES ('support_chat_uploads', 'support_chat_uploads', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "support_chat_uploads_insert_service" ON storage.objects;
DROP POLICY IF EXISTS "support_chat_uploads_select_public" ON storage.objects;

CREATE POLICY "support_chat_uploads_select_public"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'support_chat_uploads');

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS address text;

DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
CREATE POLICY "avatars_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
CREATE POLICY "avatars_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
CREATE POLICY "avatars_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
CREATE POLICY "avatars_select_public"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'avatars'
    AND coalesce(array_length(storage.foldername(name), 1), 0) >= 2
    AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );


-- =============================================================================
-- E) SIGUIENTE PASO si usas POS / productos / proveedores y fallan:
--    Ejecuta en el editor el archivo completo:
--    supabase/migrations/202604021500_products_pos_sales_and_invoices_core.sql
--
-- F) Chat interno con RLS por organización (si el chat falla por permisos):
--    supabase/migrations/202604021800_chat_messages_ensure_organization_id.sql
--
-- G) Campana → ticket: si al pulsar un aviso sale «no pertenece a tu taller», aplica:
--    supabase/migrations/202604023500_repair_tickets_rls_via_panel_notification.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- G) repair_tickets: leer/actualizar si hay panel_notifications para este usuario
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own tickets" ON public.repair_tickets;

CREATE POLICY "Users can view own tickets"
  ON public.repair_tickets FOR SELECT
  TO authenticated
  USING (
    is_super_admin()
    OR auth.uid() = user_id
    OR (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
    OR EXISTS (
      SELECT 1
      FROM public.panel_notifications pn
      WHERE pn.ticket_id = repair_tickets.id
        AND pn.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own tickets" ON public.repair_tickets;

CREATE POLICY "Users can update own tickets"
  ON public.repair_tickets FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
    OR EXISTS (
      SELECT 1
      FROM public.panel_notifications pn
      WHERE pn.ticket_id = repair_tickets.id
        AND pn.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
    OR EXISTS (
      SELECT 1
      FROM public.panel_notifications pn
      WHERE pn.ticket_id = repair_tickets.id
        AND pn.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- H) Chat interno: función para borrar mensajes con más de 7 días (cron / manual)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_chat_messages_older_than_7_days()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH deleted AS (
    DELETE FROM public.chat_messages
    WHERE created_at < (now() AT TIME ZONE 'utc') - interval '7 days'
    RETURNING id
  )
  SELECT count(*)::int FROM deleted;
$$;

REVOKE ALL ON FUNCTION public.purge_chat_messages_older_than_7_days() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_chat_messages_older_than_7_days() TO service_role;

-- ---------------------------------------------------------------------------
-- I) Campana: aviso automático cuando un ticket pasa a REPARADO / completed
--    (requiere get_panel_user_for_technician_assignment + panel_notifications)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enqueue_panel_notify_ticket_repaired()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_num text;
  v_device text;
  v_body text;
  v_changer uuid;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF NEW.organization_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NOT (
    lower(btrim(COALESCE(NEW.status::text, ''))) IN ('reparado', 'completed')
    AND lower(btrim(COALESCE(OLD.status::text, ''))) NOT IN ('reparado', 'completed')
  ) THEN
    RETURN NEW;
  END IF;

  v_org := NEW.organization_id;
  v_changer := auth.uid();
  v_num := COALESCE(NEW.ticket_number, '');

  v_device := btrim(
    concat_ws(
      ' ',
      NULLIF(btrim(COALESCE(NEW.device_brand, '')), ''),
      NULLIF(btrim(COALESCE(NEW.device_model, '')), ''),
      NULLIF(btrim(COALESCE(NEW.device_type, '')), '')
    )
  );
  IF v_device = '' THEN
    v_device := 'Dispositivo';
  END IF;

  v_body := concat_ws(
    ' · ',
    NULLIF('Ticket ' || v_num, 'Ticket '),
    v_device,
    'Marcado reparado'
  );

  INSERT INTO public.panel_notifications (organization_id, user_id, kind, title, body, ticket_id)
  SELECT DISTINCT
    v_org,
    targets.user_id,
    'ticket_repaired_reception',
    'Equipo reparado — avisar al cliente',
    COALESCE(NULLIF(v_body, ''), 'Un equipo está listo para recogida o aviso al cliente.'),
    NEW.id
  FROM (
    SELECT om.user_id
    FROM public.organization_members om
    WHERE om.organization_id = v_org
      AND om.is_active = true
      AND om.role IN ('receptionist', 'admin', 'manager', 'owner')
    UNION
    SELECT COALESCE(
      t.panel_user_id,
      public.get_panel_user_for_technician_assignment(t.id, v_org)
    ) AS user_id
    FROM public.technicians t
    WHERE t.organization_id = v_org
      AND COALESCE(t.is_active, true) = true
      AND lower(btrim(COALESCE(t.role, ''))) = 'receptionist'
  ) AS targets(user_id)
  WHERE targets.user_id IS NOT NULL
    AND (v_changer IS NULL OR targets.user_id <> v_changer)
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om2
      WHERE om2.organization_id = v_org
        AND om2.user_id = targets.user_id
        AND om2.is_active = true
    );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_repair_tickets_notify_repaired ON public.repair_tickets;

CREATE TRIGGER trg_repair_tickets_notify_repaired
  AFTER UPDATE OF status ON public.repair_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_panel_notify_ticket_repaired();

-- ---------------------------------------------------------------------------
-- Facturas: filtros guardados + saldo pendiente (202604033700)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoice_saved_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  filter_json jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_invoice_saved_filters_org_user
  ON public.invoice_saved_filters (organization_id, user_id);

ALTER TABLE public.invoice_saved_filters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoice_saved_filters_select" ON public.invoice_saved_filters;
DROP POLICY IF EXISTS "invoice_saved_filters_insert" ON public.invoice_saved_filters;
DROP POLICY IF EXISTS "invoice_saved_filters_update" ON public.invoice_saved_filters;
DROP POLICY IF EXISTS "invoice_saved_filters_delete" ON public.invoice_saved_filters;

CREATE POLICY "invoice_saved_filters_select"
  ON public.invoice_saved_filters FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR user_id = auth.uid()
    OR (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
  );

CREATE POLICY "invoice_saved_filters_insert"
  ON public.invoice_saved_filters FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR (
      user_id = auth.uid()
      AND organization_id IS NOT NULL
      AND user_belongs_to_org(organization_id)
    )
  );

CREATE POLICY "invoice_saved_filters_update"
  ON public.invoice_saved_filters FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR (
      user_id = auth.uid()
      AND organization_id IS NOT NULL
      AND user_belongs_to_org(organization_id)
    )
  )
  WITH CHECK (
    is_super_admin()
    OR (
      user_id = auth.uid()
      AND organization_id IS NOT NULL
      AND user_belongs_to_org(organization_id)
    )
  );

CREATE POLICY "invoice_saved_filters_delete"
  ON public.invoice_saved_filters FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR (
      user_id = auth.uid()
      AND organization_id IS NOT NULL
      AND user_belongs_to_org(organization_id)
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_saved_filters TO authenticated;

CREATE OR REPLACE FUNCTION public.organization_invoice_open_balance(p_organization_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(
    SUM(
      GREATEST(
        0::numeric,
        COALESCE(i.total_amount, 0) - COALESCE(i.paid_amount, 0) - COALESCE(i.refunded_amount, 0)
      )
    ),
    0::numeric
  )
  FROM public.invoices i
  WHERE i.organization_id = p_organization_id
    AND i.status NOT IN ('cancelled', 'draft')
    AND GREATEST(
      0::numeric,
      COALESCE(i.total_amount, 0) - COALESCE(i.paid_amount, 0) - COALESCE(i.refunded_amount, 0)
    ) > 0.005;
$$;

REVOKE ALL ON FUNCTION public.organization_invoice_open_balance(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.organization_invoice_open_balance(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Sesiones del panel (202604033900)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_panel_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_key text NOT NULL,
  user_agent text,
  ip_address text,
  location_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_panel_sessions_user_client UNIQUE (user_id, client_key)
);

CREATE INDEX IF NOT EXISTS idx_user_panel_sessions_user_last
  ON public.user_panel_sessions (user_id, last_active_at DESC);

ALTER TABLE public.user_panel_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_panel_sessions_select_own" ON public.user_panel_sessions;
DROP POLICY IF EXISTS "user_panel_sessions_insert_own" ON public.user_panel_sessions;
DROP POLICY IF EXISTS "user_panel_sessions_update_own" ON public.user_panel_sessions;
DROP POLICY IF EXISTS "user_panel_sessions_delete_own" ON public.user_panel_sessions;

CREATE POLICY "user_panel_sessions_select_own"
  ON public.user_panel_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_panel_sessions_insert_own"
  ON public.user_panel_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_panel_sessions_update_own"
  ON public.user_panel_sessions FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_panel_sessions_delete_own"
  ON public.user_panel_sessions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_panel_sessions TO authenticated;

-- ---------------------------------------------------------------------------
-- Gastos: organization_id + categorías (202604034000)
-- ---------------------------------------------------------------------------
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_organization_id
  ON public.expenses (organization_id)
  WHERE organization_id IS NOT NULL;

UPDATE public.expenses e
SET organization_id = p.organization_id
FROM public.profiles p
WHERE e.user_id = p.id
  AND p.organization_id IS NOT NULL
  AND e.organization_id IS NULL;

CREATE TABLE IF NOT EXISTS public.expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT expense_categories_org_name_unique UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_expense_categories_org_sort
  ON public.expense_categories (organization_id, sort_order, name);

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expense_categories_select" ON public.expense_categories;
DROP POLICY IF EXISTS "expense_categories_insert" ON public.expense_categories;
DROP POLICY IF EXISTS "expense_categories_update" ON public.expense_categories;
DROP POLICY IF EXISTS "expense_categories_delete" ON public.expense_categories;

CREATE POLICY "expense_categories_select"
  ON public.expense_categories FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR organization_id IN (SELECT public.user_organization_ids())
  );

CREATE POLICY "expense_categories_insert"
  ON public.expense_categories FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR organization_id IN (SELECT public.user_organization_ids())
  );

CREATE POLICY "expense_categories_update"
  ON public.expense_categories FOR UPDATE TO authenticated
  USING (
    is_super_admin()
    OR organization_id IN (SELECT public.user_organization_ids())
  )
  WITH CHECK (
    is_super_admin()
    OR organization_id IN (SELECT public.user_organization_ids())
  );

CREATE POLICY "expense_categories_delete"
  ON public.expense_categories FOR DELETE TO authenticated
  USING (
    is_super_admin()
    OR organization_id IN (SELECT public.user_organization_ids())
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO authenticated;

-- ---------------------------------------------------------------------------
-- Facturas → organizations: FK para embed PostgREST (202604034100)
-- ---------------------------------------------------------------------------
UPDATE public.invoices i
SET organization_id = NULL
WHERE i.organization_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = i.organization_id);

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class tbl ON tbl.oid = c.conrelid
    JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
    WHERE ns.nspname = 'public'
      AND tbl.relname = 'invoices'
      AND c.contype = 'f'
      AND c.confrelid = 'public.organizations'::regclass
  ) LOOP
    EXECUTE format('ALTER TABLE public.invoices DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- RLS: recursión infinita en organization_members (202604034200)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_organization_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT organization_id
  FROM public.organization_members
  WHERE user_id = auth.uid()
    AND is_active = true;
$$;

GRANT EXECUTE ON FUNCTION public.user_organization_ids() TO authenticated;

CREATE OR REPLACE FUNCTION public.user_belongs_to_org(org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND is_active = true
  )
  OR EXISTS (
    SELECT 1
    FROM public.organizations o
    WHERE o.id = org_id
      AND o.owner_id = auth.uid()
      AND o.deleted_at IS NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  org_id uuid;
BEGIN
  SELECT om.organization_id INTO org_id
  FROM public.organization_members om
  WHERE om.user_id = auth.uid()
    AND om.is_active = true
  ORDER BY om.joined_at ASC
  LIMIT 1;

  IF org_id IS NOT NULL THEN
    RETURN org_id;
  END IF;

  SELECT o.id INTO org_id
  FROM public.organizations o
  WHERE o.owner_id = auth.uid()
    AND o.deleted_at IS NULL
  ORDER BY o.created_at ASC
  LIMIT 1;

  RETURN org_id;
END;
$$;

-- Políticas antiguas (EXISTS sobre organization_members) deben eliminarse si siguen
-- activas junto a members_* (202604031000); si no, la recursión RLS continúa.
DROP POLICY IF EXISTS "Users can view members of their organizations" ON public.organization_members;
DROP POLICY IF EXISTS "Owners and admins can insert members" ON public.organization_members;
DROP POLICY IF EXISTS "Owners and admins can update members" ON public.organization_members;
DROP POLICY IF EXISTS "Owners and admins can delete members" ON public.organization_members;

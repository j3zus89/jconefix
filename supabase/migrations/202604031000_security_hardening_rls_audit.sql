-- ============================================================
-- SECURITY HARDENING — RLS Audit & Strict Policies
-- Ejecutar en: Supabase SQL Editor (producción)
-- Fecha: 2026-04-03
-- ============================================================
-- Objetivo: garantizar que CADA tabla tenga RLS habilitado y
-- políticas que aseguren aislamiento total entre organizaciones.
-- Nadie puede leer, insertar, editar ni borrar datos de otra org.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- HELPER FUNCTION: user_organization_ids
-- Devuelve los IDs de organización a las que pertenece el usuario
-- autenticado (activo). Usada en las políticas como subquery.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.user_organization_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.organization_members
  WHERE user_id = auth.uid()
    AND is_active = true;
$$;

GRANT EXECUTE ON FUNCTION public.user_organization_ids() TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 1. ORGANIZATIONS
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orgs_select_member"      ON public.organizations;
DROP POLICY IF EXISTS "orgs_update_owner"        ON public.organizations;
DROP POLICY IF EXISTS "orgs_insert_authenticated" ON public.organizations;
DROP POLICY IF EXISTS "orgs_delete_owner"        ON public.organizations;

-- Ver: sólo miembros activos de esa organización
CREATE POLICY "orgs_select_member" ON public.organizations
  FOR SELECT USING (id IN (SELECT public.user_organization_ids()));

-- Actualizar: sólo el owner
CREATE POLICY "orgs_update_owner" ON public.organizations
  FOR UPDATE USING (owner_id = auth.uid());

-- Insertar: solo usuarios autenticados (registro)
CREATE POLICY "orgs_insert_authenticated" ON public.organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Borrar: nunca desde el cliente (lo gestiona RPC con SECURITY DEFINER)
CREATE POLICY "orgs_delete_owner" ON public.organizations
  FOR DELETE USING (false);

-- ────────────────────────────────────────────────────────────
-- 2. ORGANIZATION_MEMBERS
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_select_own"   ON public.organization_members;
DROP POLICY IF EXISTS "members_insert_owner" ON public.organization_members;
DROP POLICY IF EXISTS "members_update_owner" ON public.organization_members;
DROP POLICY IF EXISTS "members_delete_owner" ON public.organization_members;

-- Ver: miembros de tu propia org O tu propio registro
CREATE POLICY "members_select_own" ON public.organization_members
  FOR SELECT USING (
    organization_id IN (SELECT public.user_organization_ids())
    OR user_id = auth.uid()
  );

-- Insertar/modificar/borrar: sólo el owner de la org
CREATE POLICY "members_insert_owner" ON public.organization_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE id = organization_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "members_update_owner" ON public.organization_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE id = organization_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "members_delete_owner" ON public.organization_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE id = organization_id AND owner_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- 3. REPAIR_TICKETS
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.repair_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tickets_select_org"  ON public.repair_tickets;
DROP POLICY IF EXISTS "tickets_insert_org"  ON public.repair_tickets;
DROP POLICY IF EXISTS "tickets_update_org"  ON public.repair_tickets;
DROP POLICY IF EXISTS "tickets_delete_owner" ON public.repair_tickets;

CREATE POLICY "tickets_select_org" ON public.repair_tickets
  FOR SELECT USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "tickets_insert_org" ON public.repair_tickets
  FOR INSERT WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "tickets_update_org" ON public.repair_tickets
  FOR UPDATE USING (organization_id IN (SELECT public.user_organization_ids()));

-- Borrar sólo si eres owner de la org
CREATE POLICY "tickets_delete_owner" ON public.repair_tickets
  FOR DELETE USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- 4. CUSTOMERS
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_select_org"  ON public.customers;
DROP POLICY IF EXISTS "customers_insert_org"  ON public.customers;
DROP POLICY IF EXISTS "customers_update_org"  ON public.customers;
DROP POLICY IF EXISTS "customers_delete_org"  ON public.customers;

CREATE POLICY "customers_select_org" ON public.customers
  FOR SELECT USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "customers_insert_org" ON public.customers
  FOR INSERT WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "customers_update_org" ON public.customers
  FOR UPDATE USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "customers_delete_org" ON public.customers
  FOR DELETE USING (organization_id IN (SELECT public.user_organization_ids()));

-- ────────────────────────────────────────────────────────────
-- 5. PRODUCTS / INVENTORY
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_select_org" ON public.products;
DROP POLICY IF EXISTS "products_insert_org" ON public.products;
DROP POLICY IF EXISTS "products_update_org" ON public.products;
DROP POLICY IF EXISTS "products_delete_org" ON public.products;

CREATE POLICY "products_select_org" ON public.products
  FOR SELECT USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "products_insert_org" ON public.products
  FOR INSERT WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "products_update_org" ON public.products
  FOR UPDATE USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "products_delete_org" ON public.products
  FOR DELETE USING (organization_id IN (SELECT public.user_organization_ids()));

-- ────────────────────────────────────────────────────────────
-- 6. INVOICES
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoices_select_org" ON public.invoices;
DROP POLICY IF EXISTS "invoices_insert_org" ON public.invoices;
DROP POLICY IF EXISTS "invoices_update_org" ON public.invoices;
DROP POLICY IF EXISTS "invoices_delete_org" ON public.invoices;

CREATE POLICY "invoices_select_org" ON public.invoices
  FOR SELECT USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "invoices_insert_org" ON public.invoices
  FOR INSERT WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "invoices_update_org" ON public.invoices
  FOR UPDATE USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "invoices_delete_org" ON public.invoices
  FOR DELETE USING (organization_id IN (SELECT public.user_organization_ids()));

-- ────────────────────────────────────────────────────────────
-- 7. SHOP_SETTINGS
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shop_settings_select_org" ON public.shop_settings;
DROP POLICY IF EXISTS "shop_settings_insert_org" ON public.shop_settings;
DROP POLICY IF EXISTS "shop_settings_update_org" ON public.shop_settings;

CREATE POLICY "shop_settings_select_org" ON public.shop_settings
  FOR SELECT USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "shop_settings_insert_org" ON public.shop_settings
  FOR INSERT WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "shop_settings_update_org" ON public.shop_settings
  FOR UPDATE USING (organization_id IN (SELECT public.user_organization_ids()));

-- ────────────────────────────────────────────────────────────
-- 8. PROFILES
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_org"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own"  ON public.profiles;

-- Ver tu propio perfil + los perfiles de compañeros de tu org
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (
    id = auth.uid()
    OR id IN (
      SELECT user_id FROM public.organization_members
      WHERE organization_id IN (SELECT public.user_organization_ids())
        AND is_active = true
    )
  );

-- Modificar sólo el propio
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- 9. EXPENSES
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expenses_select_org" ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert_org" ON public.expenses;
DROP POLICY IF EXISTS "expenses_update_org" ON public.expenses;
DROP POLICY IF EXISTS "expenses_delete_org" ON public.expenses;

CREATE POLICY "expenses_select_org" ON public.expenses
  FOR SELECT USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "expenses_insert_org" ON public.expenses
  FOR INSERT WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "expenses_update_org" ON public.expenses
  FOR UPDATE USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "expenses_delete_org" ON public.expenses
  FOR DELETE USING (organization_id IN (SELECT public.user_organization_ids()));

-- ────────────────────────────────────────────────────────────
-- 10. TRANSACTIONS / CASH FLOW
-- ────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions' AND table_schema = 'public') THEN
    EXECUTE 'ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "transactions_select_org" ON public.transactions';
    EXECUTE 'DROP POLICY IF EXISTS "transactions_insert_org" ON public.transactions';
    EXECUTE 'DROP POLICY IF EXISTS "transactions_update_org" ON public.transactions';
    EXECUTE 'DROP POLICY IF EXISTS "transactions_delete_org" ON public.transactions';
    EXECUTE $pol$
      CREATE POLICY "transactions_select_org" ON public.transactions
        FOR SELECT USING (organization_id IN (SELECT public.user_organization_ids()))
    $pol$;
    EXECUTE $pol$
      CREATE POLICY "transactions_insert_org" ON public.transactions
        FOR INSERT WITH CHECK (organization_id IN (SELECT public.user_organization_ids()))
    $pol$;
    EXECUTE $pol$
      CREATE POLICY "transactions_update_org" ON public.transactions
        FOR UPDATE USING (organization_id IN (SELECT public.user_organization_ids()))
    $pol$;
    EXECUTE $pol$
      CREATE POLICY "transactions_delete_org" ON public.transactions
        FOR DELETE USING (organization_id IN (SELECT public.user_organization_ids()))
    $pol$;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 11. CHAT_MESSAGES
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_messages_select_org" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert_org" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_delete_own" ON public.chat_messages;

CREATE POLICY "chat_messages_select_org" ON public.chat_messages
  FOR SELECT USING (organization_id IN (SELECT public.user_organization_ids()));

-- La tabla chat_messages usa user_id (autor del mensaje), no sender_id.
CREATE POLICY "chat_messages_insert_org" ON public.chat_messages
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT public.user_organization_ids())
    AND user_id = auth.uid()
  );

-- Sólo borrar mensajes propios
CREATE POLICY "chat_messages_delete_own" ON public.chat_messages
  FOR DELETE USING (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- 12. TICKET_PARTS, TICKET_STATUSES, TICKET_COMMENTS, TECHNICIANS
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE
  tname text;
BEGIN
  FOREACH tname IN ARRAY ARRAY['ticket_parts','ticket_statuses','ticket_comments','technicians']
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tname AND table_schema = 'public') THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tname);

      -- Verificar si tiene columna organization_id
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = tname AND column_name = 'organization_id'
      ) THEN
        EXECUTE format('DROP POLICY IF EXISTS "%s_select_org" ON public.%I', tname, tname);
        EXECUTE format('DROP POLICY IF EXISTS "%s_insert_org" ON public.%I', tname, tname);
        EXECUTE format('DROP POLICY IF EXISTS "%s_update_org" ON public.%I', tname, tname);
        EXECUTE format('DROP POLICY IF EXISTS "%s_delete_org" ON public.%I', tname, tname);
        EXECUTE format(
          $pol$CREATE POLICY "%s_select_org" ON public.%I FOR SELECT USING (organization_id IN (SELECT public.user_organization_ids()))$pol$,
          tname, tname
        );
        EXECUTE format(
          $pol$CREATE POLICY "%s_insert_org" ON public.%I FOR INSERT WITH CHECK (organization_id IN (SELECT public.user_organization_ids()))$pol$,
          tname, tname
        );
        EXECUTE format(
          $pol$CREATE POLICY "%s_update_org" ON public.%I FOR UPDATE USING (organization_id IN (SELECT public.user_organization_ids()))$pol$,
          tname, tname
        );
        EXECUTE format(
          $pol$CREATE POLICY "%s_delete_org" ON public.%I FOR DELETE USING (organization_id IN (SELECT public.user_organization_ids()))$pol$,
          tname, tname
        );
      END IF;
    END IF;
  END LOOP;
END $$;

-- ────────────────────────────────────────────────────────────
-- 13. POS_SALES / CASH_DRAWER / PURCHASE_ORDERS
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE
  tname text;
BEGIN
  FOREACH tname IN ARRAY ARRAY['pos_sales','cash_drawer_sessions','purchase_orders','purchase_order_items']
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tname AND table_schema = 'public') THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tname);

      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = tname AND column_name = 'organization_id'
      ) THEN
        EXECUTE format('DROP POLICY IF EXISTS "%s_select_org" ON public.%I', tname, tname);
        EXECUTE format('DROP POLICY IF EXISTS "%s_insert_org" ON public.%I', tname, tname);
        EXECUTE format('DROP POLICY IF EXISTS "%s_update_org" ON public.%I', tname, tname);
        EXECUTE format('DROP POLICY IF EXISTS "%s_delete_org" ON public.%I', tname, tname);
        EXECUTE format(
          $pol$CREATE POLICY "%s_select_org" ON public.%I FOR SELECT USING (organization_id IN (SELECT public.user_organization_ids()))$pol$,
          tname, tname
        );
        EXECUTE format(
          $pol$CREATE POLICY "%s_insert_org" ON public.%I FOR INSERT WITH CHECK (organization_id IN (SELECT public.user_organization_ids()))$pol$,
          tname, tname
        );
        EXECUTE format(
          $pol$CREATE POLICY "%s_update_org" ON public.%I FOR UPDATE USING (organization_id IN (SELECT public.user_organization_ids()))$pol$,
          tname, tname
        );
        EXECUTE format(
          $pol$CREATE POLICY "%s_delete_org" ON public.%I FOR DELETE USING (organization_id IN (SELECT public.user_organization_ids()))$pol$,
          tname, tname
        );
      END IF;
    END IF;
  END LOOP;
END $$;

-- ────────────────────────────────────────────────────────────
-- 14. COMMERCIAL_SIGNUP_REQUESTS (tabla pública sin org — solo service_role)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.commercial_signup_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "csr_no_client_access" ON public.commercial_signup_requests;
-- Nadie (desde el cliente) puede leer los leads; sólo service_role (API routes) tiene acceso
CREATE POLICY "csr_no_client_access" ON public.commercial_signup_requests
  FOR ALL USING (false);

-- ────────────────────────────────────────────────────────────
-- 15. PANEL_NOTIFICATIONS
-- ────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'panel_notifications' AND table_schema = 'public') THEN
    EXECUTE 'ALTER TABLE public.panel_notifications ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "notif_select_recipient" ON public.panel_notifications';
    EXECUTE 'DROP POLICY IF EXISTS "notif_update_recipient" ON public.panel_notifications';
    -- panel_notifications usa user_id (destinatario), no recipient_user_id.
    EXECUTE $pol$
      CREATE POLICY "notif_select_recipient" ON public.panel_notifications
        FOR SELECT USING (user_id = auth.uid())
    $pol$;
    EXECUTE $pol$
      CREATE POLICY "notif_update_recipient" ON public.panel_notifications
        FOR UPDATE USING (user_id = auth.uid())
    $pol$;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- FIN: confirmar que todas las tablas críticas tienen RLS ON
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE
  tbl record;
  missing text[] := '{}';
BEGIN
  FOR tbl IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN (
        'organizations','organization_members','repair_tickets','customers',
        'products','invoices','shop_settings','profiles','expenses',
        'chat_messages','technicians','panel_notifications',
        'commercial_signup_requests'
      )
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = tbl.tablename AND c.relrowsecurity = true
    ) THEN
      missing := array_append(missing, tbl.tablename);
    END IF;
  END LOOP;

  IF array_length(missing, 1) > 0 THEN
    RAISE WARNING 'TABLAS SIN RLS HABILITADO: %', array_to_string(missing, ', ');
  ELSE
    RAISE NOTICE '✓ RLS HABILITADO en todas las tablas críticas.';
  END IF;
END $$;

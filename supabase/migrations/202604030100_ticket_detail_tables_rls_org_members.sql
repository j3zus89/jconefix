-- AUDITORIA TÉCNICA: RLS en tablas de detalle de ticket
-- Las políticas originales usaban shop_owner_id = auth.uid() (modo legacy single-user).
-- Con organizaciones multi-usuario, cualquier miembro activo de la org debe poder
-- leer/insertar/actualizar las piezas, imágenes, condiciones y accesorios del ticket.
-- Se replica el patrón de repair_tickets: user_id (owner) OR user_belongs_to_org(org).
-- Para obtener el organization_id se hace JOIN con repair_tickets via ticket_id.

-- ─────────────────────────────────────────
-- ticket_parts
-- ─────────────────────────────────────────
DROP POLICY IF EXISTS "Users can only see their own ticket parts" ON public.ticket_parts;
DROP POLICY IF EXISTS "Users can only insert their own ticket parts" ON public.ticket_parts;
DROP POLICY IF EXISTS "Users can only update their own ticket parts" ON public.ticket_parts;
DROP POLICY IF EXISTS "Users can only delete their own ticket parts" ON public.ticket_parts;

CREATE POLICY "ticket_parts_select"
  ON public.ticket_parts FOR SELECT TO authenticated
  USING (
    auth.uid() = shop_owner_id
    OR EXISTS (
      SELECT 1 FROM public.repair_tickets rt
      WHERE rt.id = ticket_parts.ticket_id
        AND rt.organization_id IS NOT NULL
        AND public.user_belongs_to_org(rt.organization_id)
    )
  );

CREATE POLICY "ticket_parts_insert"
  ON public.ticket_parts FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = shop_owner_id
    OR EXISTS (
      SELECT 1 FROM public.repair_tickets rt
      WHERE rt.id = ticket_parts.ticket_id
        AND rt.organization_id IS NOT NULL
        AND public.user_belongs_to_org(rt.organization_id)
    )
  );

CREATE POLICY "ticket_parts_update"
  ON public.ticket_parts FOR UPDATE TO authenticated
  USING (
    auth.uid() = shop_owner_id
    OR EXISTS (
      SELECT 1 FROM public.repair_tickets rt
      WHERE rt.id = ticket_parts.ticket_id
        AND rt.organization_id IS NOT NULL
        AND public.user_belongs_to_org(rt.organization_id)
    )
  );

CREATE POLICY "ticket_parts_delete"
  ON public.ticket_parts FOR DELETE TO authenticated
  USING (
    auth.uid() = shop_owner_id
    OR EXISTS (
      SELECT 1 FROM public.repair_tickets rt
      WHERE rt.id = ticket_parts.ticket_id
        AND rt.organization_id IS NOT NULL
        AND public.user_belongs_to_org(rt.organization_id)
    )
  );

-- ─────────────────────────────────────────
-- ticket_inventory_items
-- ─────────────────────────────────────────
DROP POLICY IF EXISTS "Users can only see their own ticket inventory items" ON public.ticket_inventory_items;
DROP POLICY IF EXISTS "Users can only insert their own ticket inventory items" ON public.ticket_inventory_items;
DROP POLICY IF EXISTS "Users can only delete their own ticket inventory items" ON public.ticket_inventory_items;

CREATE POLICY "ticket_inv_items_select"
  ON public.ticket_inventory_items FOR SELECT TO authenticated
  USING (
    auth.uid() = shop_owner_id
    OR EXISTS (
      SELECT 1 FROM public.repair_tickets rt
      WHERE rt.id = ticket_inventory_items.ticket_id
        AND rt.organization_id IS NOT NULL
        AND public.user_belongs_to_org(rt.organization_id)
    )
  );

CREATE POLICY "ticket_inv_items_insert"
  ON public.ticket_inventory_items FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = shop_owner_id
    OR EXISTS (
      SELECT 1 FROM public.repair_tickets rt
      WHERE rt.id = ticket_inventory_items.ticket_id
        AND rt.organization_id IS NOT NULL
        AND public.user_belongs_to_org(rt.organization_id)
    )
  );

CREATE POLICY "ticket_inv_items_delete"
  ON public.ticket_inventory_items FOR DELETE TO authenticated
  USING (
    auth.uid() = shop_owner_id
    OR EXISTS (
      SELECT 1 FROM public.repair_tickets rt
      WHERE rt.id = ticket_inventory_items.ticket_id
        AND rt.organization_id IS NOT NULL
        AND public.user_belongs_to_org(rt.organization_id)
    )
  );

-- ─────────────────────────────────────────
-- ticket_images
-- ─────────────────────────────────────────
DROP POLICY IF EXISTS "Users can only see their own ticket images" ON public.ticket_images;
DROP POLICY IF EXISTS "Users can only insert their own ticket images" ON public.ticket_images;
DROP POLICY IF EXISTS "Users can only delete their own ticket images" ON public.ticket_images;
-- Aliases usados en SCHEMA_FINAL.sql
DROP POLICY IF EXISTS "images_select" ON public.ticket_images;
DROP POLICY IF EXISTS "images_insert" ON public.ticket_images;
DROP POLICY IF EXISTS "images_delete" ON public.ticket_images;

CREATE POLICY "ticket_images_select"
  ON public.ticket_images FOR SELECT TO authenticated
  USING (
    auth.uid() = shop_owner_id
    OR EXISTS (
      SELECT 1 FROM public.repair_tickets rt
      WHERE rt.id = ticket_images.ticket_id
        AND rt.organization_id IS NOT NULL
        AND public.user_belongs_to_org(rt.organization_id)
    )
  );

CREATE POLICY "ticket_images_insert"
  ON public.ticket_images FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = shop_owner_id
    OR EXISTS (
      SELECT 1 FROM public.repair_tickets rt
      WHERE rt.id = ticket_images.ticket_id
        AND rt.organization_id IS NOT NULL
        AND public.user_belongs_to_org(rt.organization_id)
    )
  );

CREATE POLICY "ticket_images_delete"
  ON public.ticket_images FOR DELETE TO authenticated
  USING (
    auth.uid() = shop_owner_id
    OR EXISTS (
      SELECT 1 FROM public.repair_tickets rt
      WHERE rt.id = ticket_images.ticket_id
        AND rt.organization_id IS NOT NULL
        AND public.user_belongs_to_org(rt.organization_id)
    )
  );

-- ─────────────────────────────────────────
-- ticket_conditions
-- ─────────────────────────────────────────
DROP POLICY IF EXISTS "Users can only see their own ticket conditions" ON public.ticket_conditions;
DROP POLICY IF EXISTS "Users can only insert their own ticket conditions" ON public.ticket_conditions;
DROP POLICY IF EXISTS "Users can only update their own ticket conditions" ON public.ticket_conditions;
DROP POLICY IF EXISTS "conditions_select" ON public.ticket_conditions;
DROP POLICY IF EXISTS "conditions_insert" ON public.ticket_conditions;
DROP POLICY IF EXISTS "conditions_update" ON public.ticket_conditions;

CREATE POLICY "ticket_conditions_select"
  ON public.ticket_conditions FOR SELECT TO authenticated
  USING (
    auth.uid() = shop_owner_id
    OR EXISTS (
      SELECT 1 FROM public.repair_tickets rt
      WHERE rt.id = ticket_conditions.ticket_id
        AND rt.organization_id IS NOT NULL
        AND public.user_belongs_to_org(rt.organization_id)
    )
  );

CREATE POLICY "ticket_conditions_insert"
  ON public.ticket_conditions FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = shop_owner_id
    OR EXISTS (
      SELECT 1 FROM public.repair_tickets rt
      WHERE rt.id = ticket_conditions.ticket_id
        AND rt.organization_id IS NOT NULL
        AND public.user_belongs_to_org(rt.organization_id)
    )
  );

CREATE POLICY "ticket_conditions_update"
  ON public.ticket_conditions FOR UPDATE TO authenticated
  USING (
    auth.uid() = shop_owner_id
    OR EXISTS (
      SELECT 1 FROM public.repair_tickets rt
      WHERE rt.id = ticket_conditions.ticket_id
        AND rt.organization_id IS NOT NULL
        AND public.user_belongs_to_org(rt.organization_id)
    )
  );

-- ─────────────────────────────────────────
-- ticket_accessories
-- ─────────────────────────────────────────
DROP POLICY IF EXISTS "Users can only see their own ticket accessories" ON public.ticket_accessories;
DROP POLICY IF EXISTS "Users can only insert their own ticket accessories" ON public.ticket_accessories;
DROP POLICY IF EXISTS "Users can only update their own ticket accessories" ON public.ticket_accessories;
DROP POLICY IF EXISTS "accessories_select" ON public.ticket_accessories;
DROP POLICY IF EXISTS "accessories_insert" ON public.ticket_accessories;
DROP POLICY IF EXISTS "accessories_update" ON public.ticket_accessories;

CREATE POLICY "ticket_accessories_select"
  ON public.ticket_accessories FOR SELECT TO authenticated
  USING (
    auth.uid() = shop_owner_id
    OR EXISTS (
      SELECT 1 FROM public.repair_tickets rt
      WHERE rt.id = ticket_accessories.ticket_id
        AND rt.organization_id IS NOT NULL
        AND public.user_belongs_to_org(rt.organization_id)
    )
  );

CREATE POLICY "ticket_accessories_insert"
  ON public.ticket_accessories FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = shop_owner_id
    OR EXISTS (
      SELECT 1 FROM public.repair_tickets rt
      WHERE rt.id = ticket_accessories.ticket_id
        AND rt.organization_id IS NOT NULL
        AND public.user_belongs_to_org(rt.organization_id)
    )
  );

CREATE POLICY "ticket_accessories_update"
  ON public.ticket_accessories FOR UPDATE TO authenticated
  USING (
    auth.uid() = shop_owner_id
    OR EXISTS (
      SELECT 1 FROM public.repair_tickets rt
      WHERE rt.id = ticket_accessories.ticket_id
        AND rt.organization_id IS NOT NULL
        AND public.user_belongs_to_org(rt.organization_id)
    )
  );

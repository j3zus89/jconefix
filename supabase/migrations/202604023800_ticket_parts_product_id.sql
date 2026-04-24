-- Piezas de ticket: enlace a repuestos (products) + acceso por ticket/organización (técnicos del taller).
-- Ejecutar en Supabase si falla el insert con product_id o si solo ves tus propias piezas.

ALTER TABLE public.ticket_parts
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ticket_parts_product_id
  ON public.ticket_parts(product_id)
  WHERE product_id IS NOT NULL;

COMMENT ON COLUMN public.ticket_parts.product_id IS 'Repuesto seleccionado desde inventario (products).';

-- Sustituir RLS antigua (solo shop_owner_id) por acceso vía repair_tickets del mismo taller.
DROP POLICY IF EXISTS "Users can only see their own ticket parts" ON public.ticket_parts;
DROP POLICY IF EXISTS "Users can only insert their own ticket parts" ON public.ticket_parts;
DROP POLICY IF EXISTS "Users can only update their own ticket parts" ON public.ticket_parts;
DROP POLICY IF EXISTS "Users can only delete their own ticket parts" ON public.ticket_parts;
DROP POLICY IF EXISTS "parts_select" ON public.ticket_parts;
DROP POLICY IF EXISTS "parts_insert" ON public.ticket_parts;
DROP POLICY IF EXISTS "parts_update" ON public.ticket_parts;
DROP POLICY IF EXISTS "parts_delete" ON public.ticket_parts;
DROP POLICY IF EXISTS "ticket_parts_select_via_ticket" ON public.ticket_parts;
DROP POLICY IF EXISTS "ticket_parts_insert_via_ticket" ON public.ticket_parts;
DROP POLICY IF EXISTS "ticket_parts_update_via_ticket" ON public.ticket_parts;
DROP POLICY IF EXISTS "ticket_parts_delete_via_ticket" ON public.ticket_parts;

CREATE POLICY "ticket_parts_select_via_ticket"
  ON public.ticket_parts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.repair_tickets rt
      WHERE rt.id = ticket_parts.ticket_id
        AND (
          rt.user_id = auth.uid()
          OR (rt.organization_id IS NOT NULL AND public.user_belongs_to_org(rt.organization_id))
        )
    )
  );

CREATE POLICY "ticket_parts_insert_via_ticket"
  ON public.ticket_parts FOR INSERT TO authenticated
  WITH CHECK (
    shop_owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.repair_tickets rt
      WHERE rt.id = ticket_parts.ticket_id
        AND (
          rt.user_id = auth.uid()
          OR (rt.organization_id IS NOT NULL AND public.user_belongs_to_org(rt.organization_id))
        )
    )
  );

CREATE POLICY "ticket_parts_update_via_ticket"
  ON public.ticket_parts FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.repair_tickets rt
      WHERE rt.id = ticket_parts.ticket_id
        AND (
          rt.user_id = auth.uid()
          OR (rt.organization_id IS NOT NULL AND public.user_belongs_to_org(rt.organization_id))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.repair_tickets rt
      WHERE rt.id = ticket_parts.ticket_id
        AND (
          rt.user_id = auth.uid()
          OR (rt.organization_id IS NOT NULL AND public.user_belongs_to_org(rt.organization_id))
        )
    )
  );

CREATE POLICY "ticket_parts_delete_via_ticket"
  ON public.ticket_parts FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.repair_tickets rt
      WHERE rt.id = ticket_parts.ticket_id
        AND (
          rt.user_id = auth.uid()
          OR (rt.organization_id IS NOT NULL AND public.user_belongs_to_org(rt.organization_id))
        )
    )
  );

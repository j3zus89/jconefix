/*
  Abrir ticket desde la campana: muchas órdenes legacy tienen organization_id NULL o un taller
  distinto al que ve getActiveOrganizationId; el asignado no es user_id del ticket.
  Si ya existe un aviso de panel que enlaza ticket + usuario, debe poder leer (y actualizar) esa orden.
*/

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

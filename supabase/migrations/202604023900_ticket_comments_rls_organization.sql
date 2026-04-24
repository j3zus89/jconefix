-- Comentarios del ticket: permitir a miembros de la organización (técnicos, recepción)
-- igual que repair_tickets, no solo al user_id creador del ticket.

DROP POLICY IF EXISTS "Users can view comments on own tickets" ON public.ticket_comments;
DROP POLICY IF EXISTS "Users can insert comments on own tickets" ON public.ticket_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.ticket_comments;
DROP POLICY IF EXISTS "ticket_comments_select_via_ticket" ON public.ticket_comments;
DROP POLICY IF EXISTS "ticket_comments_insert_via_ticket" ON public.ticket_comments;
DROP POLICY IF EXISTS "ticket_comments_delete_via_ticket" ON public.ticket_comments;

CREATE POLICY "ticket_comments_select_via_ticket"
  ON public.ticket_comments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.repair_tickets rt
      WHERE rt.id = ticket_comments.ticket_id
        AND (
          rt.user_id = auth.uid()
          OR (rt.organization_id IS NOT NULL AND public.user_belongs_to_org(rt.organization_id))
        )
    )
  );

CREATE POLICY "ticket_comments_insert_via_ticket"
  ON public.ticket_comments FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.repair_tickets rt
      WHERE rt.id = ticket_comments.ticket_id
        AND (
          rt.user_id = auth.uid()
          OR (rt.organization_id IS NOT NULL AND public.user_belongs_to_org(rt.organization_id))
        )
    )
  );

CREATE POLICY "ticket_comments_delete_via_ticket"
  ON public.ticket_comments FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.repair_tickets rt
      WHERE rt.id = ticket_comments.ticket_id
        AND (
          rt.user_id = auth.uid()
          OR (rt.organization_id IS NOT NULL AND public.user_belongs_to_org(rt.organization_id))
        )
    )
  );

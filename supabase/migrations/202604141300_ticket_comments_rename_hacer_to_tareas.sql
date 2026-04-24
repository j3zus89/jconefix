-- Renombrar tipo de comentario «hacer» → «tareas» (pestaña del detalle de orden).

UPDATE public.ticket_comments
SET comment_type = 'tareas'
WHERE comment_type = 'hacer';

DROP POLICY IF EXISTS "ticket_comments_update_own_editable" ON public.ticket_comments;

CREATE POLICY "ticket_comments_update_own_editable"
  ON public.ticket_comments FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    AND immutable_comment = false
    AND comment_type IN ('tareas', 'privados', 'diagnostico')
    AND EXISTS (
      SELECT 1 FROM public.repair_tickets rt
      WHERE rt.id = ticket_comments.ticket_id
        AND (
          rt.user_id = auth.uid()
          OR (rt.organization_id IS NOT NULL AND public.user_belongs_to_org(rt.organization_id))
        )
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND immutable_comment = false
    AND comment_type IN ('tareas', 'privados', 'diagnostico')
    AND EXISTS (
      SELECT 1 FROM public.repair_tickets rt
      WHERE rt.id = ticket_comments.ticket_id
        AND (
          rt.user_id = auth.uid()
          OR (rt.organization_id IS NOT NULL AND public.user_belongs_to_org(rt.organization_id))
        )
    )
  );

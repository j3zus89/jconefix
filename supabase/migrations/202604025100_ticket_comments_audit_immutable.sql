-- Comentarios de ticket: trazabilidad (acuse en «Hacer»), sin borrado, edición solo del texto.

ALTER TABLE public.ticket_comments
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

UPDATE public.ticket_comments
SET updated_at = created_at
WHERE updated_at IS NULL;

ALTER TABLE public.ticket_comments
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE public.ticket_comments
  ADD COLUMN IF NOT EXISTS immutable_comment boolean NOT NULL DEFAULT false;

-- Cambios de estado históricos: tipo dedicado e inmutables.
UPDATE public.ticket_comments
SET comment_type = 'estado', immutable_comment = true
WHERE comment_type = 'hacer'
  AND content ILIKE '%cambió el estado%';

UPDATE public.ticket_comments
SET immutable_comment = true
WHERE comment_type IN ('email_sms', 'sistema');

-- Tipos automáticos quedan bloqueados aunque el cliente envíe otro valor.
CREATE OR REPLACE FUNCTION public.ticket_comments_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.comment_type IN (
    'estado', 'acceso', 'email_sms', 'sistema', 'pieza', 'nota_ticket'
  ) THEN
    NEW.immutable_comment := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ticket_comments_before_insert ON public.ticket_comments;
CREATE TRIGGER trg_ticket_comments_before_insert
  BEFORE INSERT ON public.ticket_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.ticket_comments_before_insert();

CREATE OR REPLACE FUNCTION public.ticket_comments_before_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.immutable_comment THEN
    RAISE EXCEPTION 'Este registro no se puede modificar ni eliminar';
  END IF;

  IF NEW.ticket_id IS DISTINCT FROM OLD.ticket_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.comment_type IS DISTINCT FROM OLD.comment_type
     OR NEW.is_private IS DISTINCT FROM OLD.is_private
     OR NEW.immutable_comment IS DISTINCT FROM OLD.immutable_comment
     OR NEW.author_name IS DISTINCT FROM OLD.author_name THEN
    RAISE EXCEPTION 'Solo se puede editar el texto del comentario';
  END IF;

  IF trim(both FROM NEW.content) = '' THEN
    RAISE EXCEPTION 'El comentario no puede quedar vacío';
  END IF;

  IF NEW.content IS DISTINCT FROM OLD.content THEN
    NEW.updated_at := now();
  ELSE
    NEW.updated_at := OLD.updated_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ticket_comments_before_update ON public.ticket_comments;
CREATE TRIGGER trg_ticket_comments_before_update
  BEFORE UPDATE ON public.ticket_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.ticket_comments_before_update();

-- Sin borrado para usuarios autenticados (conservar historial).
DROP POLICY IF EXISTS "ticket_comments_delete_via_ticket" ON public.ticket_comments;
DROP POLICY IF EXISTS "ticket_comments_delete_denied" ON public.ticket_comments;

CREATE POLICY "ticket_comments_delete_denied"
  ON public.ticket_comments FOR DELETE TO authenticated
  USING (false);

-- Como máximo un acuse «acceso» por usuario, ticket y día (UTC), evita duplicados por doble montaje o carreras.
CREATE UNIQUE INDEX IF NOT EXISTS ticket_comments_acceso_one_per_user_ticket_day
  ON public.ticket_comments (
    ticket_id,
    user_id,
    (( (created_at AT TIME ZONE 'UTC')::date ))
  )
  WHERE comment_type = 'acceso';

-- Solo el autor puede editar comentarios «libres» (solo el texto).
DROP POLICY IF EXISTS "ticket_comments_update_own_editable" ON public.ticket_comments;

CREATE POLICY "ticket_comments_update_own_editable"
  ON public.ticket_comments FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    AND immutable_comment = false
    AND comment_type IN ('hacer', 'privados', 'diagnostico')
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
    AND comment_type IN ('hacer', 'privados', 'diagnostico')
    AND EXISTS (
      SELECT 1 FROM public.repair_tickets rt
      WHERE rt.id = ticket_comments.ticket_id
        AND (
          rt.user_id = auth.uid()
          OR (rt.organization_id IS NOT NULL AND public.user_belongs_to_org(rt.organization_id))
        )
    )
  );

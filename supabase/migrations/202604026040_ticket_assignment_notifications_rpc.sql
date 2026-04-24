-- Notificaciones al asignar ticket: todo en servidor (SECURITY DEFINER).
-- El cliente a menudo no puede leer la fila technicians (RLS) o el INSERT en panel_notifications
-- seguía fallando; esto evita depender de SELECT/INSERT como el usuario de la sesión.

CREATE OR REPLACE FUNCTION public.technician_in_organization_scope(
  p_technician_id uuid,
  p_organization_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.technicians t
    WHERE t.id = p_technician_id
      AND COALESCE(t.is_active, true)
      AND (
        t.organization_id = p_organization_id
        OR (
          t.organization_id IS NULL
          AND EXISTS (
            SELECT 1
            FROM public.organizations o
            WHERE o.id = p_organization_id
              AND o.deleted_at IS NULL
              AND (
                o.owner_id = t.shop_owner_id
                OR EXISTS (
                  SELECT 1
                  FROM public.organization_members omx
                  WHERE omx.organization_id = o.id
                    AND omx.user_id = t.shop_owner_id
                    AND omx.is_active = true
                )
              )
          )
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.technician_in_organization_scope(uuid, uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.create_ticket_assignment_notifications(
  p_organization_id uuid,
  p_ticket_id uuid,
  p_ticket_number text,
  p_device_summary text,
  p_technician_ref text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_ref text := trim(both from coalesce(p_technician_ref, ''));
  v_uuid_try uuid;
  v_tid uuid;
  v_panel_user uuid;
  v_tname text;
  v_target uuid;
  v_body text;
  v_peer_body text;
  v_assignee_notified boolean := false;
  v_team_notified int := 0;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object(
      'assignee_notified', false,
      'team_notified', 0,
      'error', 'not_authenticated'
    );
  END IF;

  IF NOT public.user_belongs_to_org(p_organization_id) THEN
    RETURN jsonb_build_object(
      'assignee_notified', false,
      'team_notified', 0,
      'error', 'forbidden'
    );
  END IF;

  IF v_ref = '' THEN
    RETURN jsonb_build_object(
      'assignee_notified', false,
      'team_notified', 0,
      'error', 'empty_ref'
    );
  END IF;

  v_uuid_try := NULL;
  BEGIN
    v_uuid_try := v_ref::uuid;
  EXCEPTION
    WHEN invalid_text_representation THEN
      v_uuid_try := NULL;
  END;

  IF v_uuid_try IS NOT NULL THEN
    SELECT t.id, t.panel_user_id, t.name
    INTO v_tid, v_panel_user, v_tname
    FROM public.technicians t
    WHERE t.id = v_uuid_try
      AND public.technician_in_organization_scope(t.id, p_organization_id);
  ELSE
    SELECT t.id, t.panel_user_id, t.name
    INTO v_tid, v_panel_user, v_tname
    FROM public.technicians t
    WHERE public.technician_in_organization_scope(t.id, p_organization_id)
      AND lower(trim(t.name)) = lower(v_ref)
    ORDER BY t.created_at ASC
    LIMIT 1;
  END IF;

  IF NOT FOUND OR v_tid IS NULL THEN
    RETURN jsonb_build_object(
      'assignee_notified', false,
      'team_notified', 0,
      'error', 'technician_not_found'
    );
  END IF;

  v_target := v_panel_user;
  IF v_target IS NULL THEN
    v_target := public.get_panel_user_for_technician_assignment(v_tid, p_organization_id);
  END IF;

  IF v_target IS NOT NULL AND v_panel_user IS NULL THEN
    UPDATE public.technicians
    SET panel_user_id = v_target
    WHERE id = v_tid
      AND panel_user_id IS NULL;
  END IF;

  v_body := trim(both from concat_ws(
    ' · ',
    CASE
      WHEN nullif(trim(p_ticket_number), '') IS NOT NULL
        THEN 'Ticket ' || trim(p_ticket_number)
    END,
    nullif(trim(p_device_summary), '')
  ));

  IF v_body = '' THEN
    v_body := 'Nuevo ticket asignado';
  END IF;

  IF v_target IS NOT NULL THEN
    INSERT INTO public.panel_notifications (
      organization_id,
      user_id,
      kind,
      title,
      body,
      ticket_id
    )
    VALUES (
      p_organization_id,
      v_target,
      'ticket_assigned',
      'Equipo asignado a ti',
      v_body,
      p_ticket_id
    );
    v_assignee_notified := true;
  END IF;

  v_peer_body := trim(both from concat_ws(
    ' · ',
    coalesce(nullif(trim(v_tname), ''), 'Un compañero'),
    v_body
  ));

  INSERT INTO public.panel_notifications (
    organization_id,
    user_id,
    kind,
    title,
    body,
    ticket_id
  )
  SELECT
    p_organization_id,
    m.user_id,
    'ticket_assigned_team',
    'Nueva asignación en el taller',
    v_peer_body,
    p_ticket_id
  FROM public.organization_members m
  WHERE m.organization_id = p_organization_id
    AND m.is_active = true
    AND m.user_id IS DISTINCT FROM v_target;

  GET DIAGNOSTICS v_team_notified = ROW_COUNT;

  RETURN jsonb_build_object(
    'assignee_notified', v_assignee_notified,
    'team_notified', coalesce(v_team_notified, 0),
    'error', CASE
      WHEN v_target IS NULL THEN 'no_panel_user_for_technician'
      ELSE NULL
    END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_ticket_assignment_notifications(
  uuid, uuid, text, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_ticket_assignment_notifications(
  uuid, uuid, text, text, text
) TO authenticated;

COMMENT ON FUNCTION public.create_ticket_assignment_notifications(uuid, uuid, text, text, text) IS
  'Inserta avisos de campana al asignar ticket (asignado + equipo). SECURITY DEFINER; exige user_belongs_to_org.';

-- Quien está enlazado como usuario del panel puede leer su fila de técnico (útil fuera de este RPC).
DROP POLICY IF EXISTS "Owners can view their technicians" ON public.technicians;
CREATE POLICY "Owners can view their technicians"
  ON public.technicians FOR SELECT
  TO authenticated
  USING (
    auth.uid() = shop_owner_id
    OR
    (organization_id IS NOT NULL AND user_belongs_to_org(organization_id))
    OR
    (panel_user_id IS NOT NULL AND auth.uid() = panel_user_id)
  );

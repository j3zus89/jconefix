-- Solo el usuario asignado recibe aviso en la campana (ticket_assigned).
-- Se quitan las filas ticket_assigned_team para el resto del equipo.

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
  v_assignee_notified boolean := false;
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
      'Te han asignado un ticket',
      v_body,
      p_ticket_id
    );
    v_assignee_notified := true;
  END IF;

  RETURN jsonb_build_object(
    'assignee_notified', v_assignee_notified,
    'team_notified', 0,
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
  'Campana: una fila ticket_assigned solo para el usuario del panel del técnico asignado. SECURITY DEFINER.';

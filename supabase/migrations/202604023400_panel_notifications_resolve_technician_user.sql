-- Resuelve el usuario del panel para un técnico: panel_user_id o coincidencia email + miembro activo de la org.

CREATE OR REPLACE FUNCTION public.get_panel_user_for_technician_assignment(
  p_technician_id uuid,
  p_organization_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_panel uuid;
  v_email text;
BEGIN
  SELECT t.panel_user_id, t.email
  INTO v_panel, v_email
  FROM public.technicians t
  WHERE t.id = p_technician_id;

  IF v_panel IS NOT NULL THEN
    RETURN v_panel;
  END IF;

  IF v_email IS NULL OR btrim(v_email) = '' THEN
    RETURN NULL;
  END IF;

  SELECT m.user_id
  INTO v_panel
  FROM public.organization_members m
  JOIN auth.users u ON u.id = m.user_id
  WHERE m.organization_id = p_organization_id
    AND m.is_active = true
    AND lower(btrim(u.email)) = lower(btrim(v_email))
  LIMIT 1;

  RETURN v_panel;
END;
$$;

REVOKE ALL ON FUNCTION public.get_panel_user_for_technician_assignment(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_panel_user_for_technician_assignment(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.get_panel_user_for_technician_assignment IS
  'Para notificaciones: devuelve auth user del técnico (panel_user_id o email igual a un miembro activo de la organización).';

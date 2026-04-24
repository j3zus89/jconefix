-- Avatar del técnico asignado: lectura en servidor (bypass RLS de profiles) cuando el
-- llamador es miembro activo de la organización del ticket. Así la foto se muestra
-- aunque la política de profiles no exponga la fila del compañero (p. ej. datos legacy).

CREATE OR REPLACE FUNCTION public.get_technician_assignee_avatar_url(
  p_technician_id uuid,
  p_organization_id uuid
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_url text;
BEGIN
  IF p_technician_id IS NULL OR p_organization_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_members m
    WHERE m.user_id = auth.uid()
      AND m.organization_id = p_organization_id
      AND m.is_active = true
  ) THEN
    RETURN NULL;
  END IF;

  v_uid := public.get_panel_user_for_technician_assignment(
    p_technician_id,
    p_organization_id
  );
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT p.avatar_url INTO v_url
  FROM public.profiles p
  WHERE p.id = v_uid;

  IF v_url IS NULL OR btrim(v_url) = '' THEN
    RETURN NULL;
  END IF;

  RETURN v_url;
END;
$$;

REVOKE ALL ON FUNCTION public.get_technician_assignee_avatar_url(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_technician_assignee_avatar_url(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.get_technician_assignee_avatar_url IS
  'URL pública de avatar del usuario del panel asociado al técnico; sólo si el caller es miembro activo de p_organization_id.';

-- Campana: INSERT fallaba cuando el técnico tiene panel_user_id pero organization_id NULL
-- (filas legacy / mismo criterio que el formulario: organization_id O shop_owner_id).
-- La política 202604025800 exigía t.organization_id = panel_notifications.organization_id → sin coincidencia.

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

  IF v_panel IS NOT NULL THEN
    RETURN v_panel;
  END IF;

  -- Dueño de la org con el mismo email (puede no tener fila en organization_members)
  SELECT o.owner_id
  INTO v_panel
  FROM public.organizations o
  JOIN auth.users u ON u.id = o.owner_id
  WHERE o.id = p_organization_id
    AND o.deleted_at IS NULL
    AND o.owner_id IS NOT NULL
    AND lower(btrim(u.email)) = lower(btrim(v_email))
  LIMIT 1;

  RETURN v_panel;
END;
$$;

REVOKE ALL ON FUNCTION public.get_panel_user_for_technician_assignment(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_panel_user_for_technician_assignment(uuid, uuid) TO authenticated;

-- technician asociado al ticket.org: organization_id explícito O solo shop_owner (dueño/miembro de esa org)
DROP POLICY IF EXISTS "panel_notifications_insert_for_org_member" ON public.panel_notifications;
CREATE POLICY "panel_notifications_insert_for_org_member"
  ON public.panel_notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    user_belongs_to_org(organization_id)
    AND (
      EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.organization_id = panel_notifications.organization_id
          AND om.user_id = panel_notifications.user_id
          AND om.is_active = true
      )
      OR EXISTS (
        SELECT 1 FROM public.technicians t
        WHERE COALESCE(t.is_active, true)
          AND t.panel_user_id = panel_notifications.user_id
          AND (
            t.organization_id = panel_notifications.organization_id
            OR (
              t.organization_id IS NULL
              AND EXISTS (
                SELECT 1 FROM public.organizations o
                WHERE o.id = panel_notifications.organization_id
                  AND o.deleted_at IS NULL
                  AND (
                    o.owner_id = t.shop_owner_id
                    OR EXISTS (
                      SELECT 1 FROM public.organization_members omx
                      WHERE omx.organization_id = o.id
                        AND omx.user_id = t.shop_owner_id
                        AND omx.is_active = true
                    )
                  )
              )
            )
          )
      )
      OR EXISTS (
        SELECT 1 FROM public.technicians t
        JOIN auth.users u ON u.id = panel_notifications.user_id
        WHERE COALESCE(t.is_active, true)
          AND t.email IS NOT NULL
          AND btrim(t.email) <> ''
          AND lower(btrim(u.email)) = lower(btrim(t.email))
          AND (
            t.organization_id = panel_notifications.organization_id
            OR (
              t.organization_id IS NULL
              AND EXISTS (
                SELECT 1 FROM public.organizations o
                WHERE o.id = panel_notifications.organization_id
                  AND o.deleted_at IS NULL
                  AND (
                    o.owner_id = t.shop_owner_id
                    OR EXISTS (
                      SELECT 1 FROM public.organization_members omx
                      WHERE omx.organization_id = o.id
                        AND omx.user_id = t.shop_owner_id
                        AND omx.is_active = true
                    )
                  )
              )
            )
          )
      )
    )
  );

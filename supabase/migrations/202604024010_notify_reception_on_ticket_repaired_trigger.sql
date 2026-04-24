-- Avisos de "equipo reparado" desde la base de datos cuando `repair_tickets.status`
-- pasa a reparado/completed. Así no depende del navegador, de RLS en el cliente
-- ni de que el miembro tenga exactamente role = receptionist (también admin, manager, owner).

CREATE OR REPLACE FUNCTION public.enqueue_panel_notify_ticket_repaired()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_num text;
  v_device text;
  v_body text;
  v_changer uuid;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF NEW.organization_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NOT (
    lower(btrim(COALESCE(NEW.status::text, ''))) IN ('reparado', 'completed')
    AND lower(btrim(COALESCE(OLD.status::text, ''))) NOT IN ('reparado', 'completed')
  ) THEN
    RETURN NEW;
  END IF;

  v_org := NEW.organization_id;
  v_changer := auth.uid();
  v_num := COALESCE(NEW.ticket_number, '');

  v_device := btrim(
    concat_ws(
      ' ',
      NULLIF(btrim(COALESCE(NEW.device_brand, '')), ''),
      NULLIF(btrim(COALESCE(NEW.device_model, '')), ''),
      NULLIF(btrim(COALESCE(NEW.device_type, '')), '')
    )
  );
  IF v_device = '' THEN
    v_device := 'Dispositivo';
  END IF;

  v_body := concat_ws(
    ' · ',
    NULLIF('Ticket ' || v_num, 'Ticket '),
    v_device,
    'Marcado reparado'
  );

  INSERT INTO public.panel_notifications (organization_id, user_id, kind, title, body, ticket_id)
  SELECT DISTINCT
    v_org,
    targets.user_id,
    'ticket_repaired_reception',
    'Equipo reparado — avisar al cliente',
    COALESCE(NULLIF(v_body, ''), 'Un equipo está listo para recogida o aviso al cliente.'),
    NEW.id
  FROM (
    SELECT om.user_id
    FROM public.organization_members om
    WHERE om.organization_id = v_org
      AND om.is_active = true
      AND om.role IN ('receptionist', 'admin', 'manager', 'owner')
    UNION
    SELECT COALESCE(
      t.panel_user_id,
      public.get_panel_user_for_technician_assignment(t.id, v_org)
    ) AS user_id
    FROM public.technicians t
    WHERE t.organization_id = v_org
      AND COALESCE(t.is_active, true) = true
      AND lower(btrim(COALESCE(t.role, ''))) = 'receptionist'
  ) AS targets(user_id)
  WHERE targets.user_id IS NOT NULL
    AND (v_changer IS NULL OR targets.user_id <> v_changer)
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om2
      WHERE om2.organization_id = v_org
        AND om2.user_id = targets.user_id
        AND om2.is_active = true
    );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enqueue_panel_notify_ticket_repaired() IS
  'Inserta panel_notifications para recepción/admin/manager/owner y técnicos recepcionista al pasar un ticket a reparado o completed.';

DROP TRIGGER IF EXISTS trg_repair_tickets_notify_repaired ON public.repair_tickets;

CREATE TRIGGER trg_repair_tickets_notify_repaired
  AFTER UPDATE OF status ON public.repair_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_panel_notify_ticket_repaired();

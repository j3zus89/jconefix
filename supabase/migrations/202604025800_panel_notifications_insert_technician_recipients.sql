-- Campana: antes solo podía insertarse notificación si user_id era organization_members activo.
-- Técnicos con `technicians.panel_user_id` o mismo email que auth.users quedaban fuera → sin aviso al asignado.

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
        WHERE t.organization_id = panel_notifications.organization_id
          AND COALESCE(t.is_active, true)
          AND t.panel_user_id = panel_notifications.user_id
      )
      OR EXISTS (
        SELECT 1 FROM public.technicians t
        JOIN auth.users u ON u.id = panel_notifications.user_id
        WHERE t.organization_id = panel_notifications.organization_id
          AND COALESCE(t.is_active, true)
          AND t.email IS NOT NULL
          AND btrim(t.email) <> ''
          AND lower(btrim(u.email)) = lower(btrim(t.email))
      )
    )
  );

-- Tiempo casi real en la campana (NotificationBell postgres_changes)
ALTER TABLE public.panel_notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE NOTICE 'supabase_realtime ausente; omite ADD TABLE panel_notifications';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'panel_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.panel_notifications;
  END IF;
END $$;

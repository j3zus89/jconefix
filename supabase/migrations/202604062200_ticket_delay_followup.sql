-- Seguimiento por retraso: motivo de espera, snooze y contadores para avisos en campana (cron + panel_notifications).

ALTER TABLE public.repair_tickets
  ADD COLUMN IF NOT EXISTS follow_up_wait_reason text,
  ADD COLUMN IF NOT EXISTS follow_up_snoozed_until timestamptz,
  ADD COLUMN IF NOT EXISTS follow_up_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS follow_up_notify_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS follow_up_last_notified_at timestamptz;

ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS delay_followup_settings jsonb;

COMMENT ON COLUMN public.repair_tickets.follow_up_wait_reason IS 'Motivo de espera para seguimiento: piece_order, customer, supplier, warranty, other (opcional).';
COMMENT ON COLUMN public.repair_tickets.follow_up_snoozed_until IS 'Hasta cuándo posponer avisos de seguimiento (snooze).';
COMMENT ON COLUMN public.repair_tickets.follow_up_started_at IS 'Inicio del periodo de seguimiento mientras el ticket está en un estado «en espera» configurado.';
COMMENT ON COLUMN public.repair_tickets.follow_up_notify_count IS 'Cuántos avisos de seguimiento se generaron para este ticket en el periodo actual.';
COMMENT ON COLUMN public.repair_tickets.follow_up_last_notified_at IS 'Última vez que se creó un aviso de seguimiento (ticket_delay_followup).';
COMMENT ON COLUMN public.shop_settings.delay_followup_settings IS 'JSON: enabled, statuses[], first_notify_days_by_reason{}, repeat_every_days, max_notifications_per_ticket.';

CREATE OR REPLACE FUNCTION public.repair_tickets_follow_up_on_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  tracked text[] := ARRAY[
    'waiting_parts',
    'pendiente_pedido',
    'pendiente_pieza',
    'pendiente_cliente',
    'presupuesto'
  ];
  old_tracked boolean;
  new_tracked boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    new_tracked := NEW.status = ANY (tracked);
    IF new_tracked THEN
      NEW.follow_up_started_at := COALESCE(NEW.follow_up_started_at, now());
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
      RETURN NEW;
    END IF;

    old_tracked := OLD.status = ANY (tracked);
    new_tracked := NEW.status = ANY (tracked);

    IF new_tracked AND NOT old_tracked THEN
      NEW.follow_up_started_at := now();
      NEW.follow_up_notify_count := 0;
      NEW.follow_up_last_notified_at := NULL;
      NEW.follow_up_snoozed_until := NULL;
    ELSIF NOT new_tracked THEN
      NEW.follow_up_started_at := NULL;
      NEW.follow_up_snoozed_until := NULL;
      NEW.follow_up_notify_count := 0;
      NEW.follow_up_last_notified_at := NULL;
      NEW.follow_up_wait_reason := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_repair_tickets_follow_up_on_status ON public.repair_tickets;
CREATE TRIGGER trg_repair_tickets_follow_up_on_status
  BEFORE INSERT OR UPDATE OF status ON public.repair_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.repair_tickets_follow_up_on_status();

-- Tickets ya en estados de espera: iniciar reloj desde la migración (evita NULL hasta el próximo cambio de estado).
UPDATE public.repair_tickets rt
SET
  follow_up_started_at = now(),
  follow_up_notify_count = 0,
  follow_up_last_notified_at = NULL
WHERE rt.follow_up_started_at IS NULL
  AND rt.status = ANY (ARRAY[
    'waiting_parts',
    'pendiente_pedido',
    'pendiente_pieza',
    'pendiente_cliente',
    'presupuesto'
  ]);

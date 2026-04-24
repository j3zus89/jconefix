-- Panel «Presupuestos»: vigencia y registro de último recordatorio por WhatsApp (sin UI en la ficha del ticket).

alter table public.repair_tickets
  add column if not exists budget_valid_until date,
  add column if not exists budget_last_reminder_at timestamptz;

comment on column public.repair_tickets.budget_valid_until is 'Fecha hasta la que aplica el presupuesto (solo panel Presupuestos).';
comment on column public.repair_tickets.budget_last_reminder_at is 'Marca de tiempo del último recordatorio enviado desde el panel Presupuestos.';

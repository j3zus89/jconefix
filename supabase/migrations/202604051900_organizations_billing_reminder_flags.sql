-- Evita reenviar el mismo aviso: guardamos para qué fecha de fin (trial o licencia) ya se notificó por email.
alter table public.organizations
  add column if not exists billing_reminder_sent_for_trial_end timestamptz null,
  add column if not exists billing_reminder_sent_for_license_end timestamptz null;

comment on column public.organizations.billing_reminder_sent_for_trial_end is
  'Si coincide con trial_ends_at, ya se envió el email de recordatorio (3 días antes del vencimiento) para esa prueba.';
comment on column public.organizations.billing_reminder_sent_for_license_end is
  'Si coincide con license_expires_at, ya se envió el email de recordatorio (3 días antes del vencimiento) para esa licencia.';

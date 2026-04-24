-- Snapshot por mensaje del agente humano (super admin) para que el cliente vea foto/nombre real, no el bot.

ALTER TABLE public.support_chat_messages
  ADD COLUMN IF NOT EXISTS admin_sender_avatar_url text,
  ADD COLUMN IF NOT EXISTS admin_sender_display_name text;

COMMENT ON COLUMN public.support_chat_messages.admin_sender_avatar_url IS
  'Foto del agente al enviar mensaje manual (profiles.avatar_url en el momento del envío).';

COMMENT ON COLUMN public.support_chat_messages.admin_sender_display_name IS
  'Nombre visible del agente al enviar mensaje manual (snapshot por mensaje).';

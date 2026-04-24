-- Número de WhatsApp del taller (solo dígitos con prefijo país, p. ej. 34612345678) para enlaces wa.me y futuras integraciones.
-- El cliente del panel no necesita API keys: solo guarda su número de atención.

ALTER TABLE public.shop_settings ADD COLUMN IF NOT EXISTS whatsapp_phone text DEFAULT '';

-- Buckets sensibles: privados + sin lectura pública/anon.
-- Las apps usan createSignedUrl (JWT autenticado) o descarga con políticas RLS.

-- Normalizar valores guardados como URL pública a ruta de objeto (para políticas y firmas).
UPDATE public.chat_messages
SET attachment_url = regexp_replace(trim(attachment_url), '^.*team_chat_uploads/', '')
WHERE attachment_url IS NOT NULL
  AND trim(attachment_url) <> ''
  AND attachment_url LIKE '%team_chat_uploads/%';

UPDATE public.support_chat_messages
SET attachment_url = regexp_replace(trim(attachment_url), '^.*support_chat_uploads/', '')
WHERE attachment_url IS NOT NULL
  AND trim(attachment_url) <> ''
  AND attachment_url LIKE '%support_chat_uploads/%';

UPDATE public.ticket_images
SET
  image_url = regexp_replace(trim(image_url), '^.*ticket-images/', ''),
  thumbnail_url = NULLIF(regexp_replace(trim(COALESCE(thumbnail_url, image_url)), '^.*ticket-images/', ''), '')
WHERE image_url IS NOT NULL
  AND trim(image_url) <> ''
  AND image_url LIKE '%ticket-images/%';

UPDATE public.ticket_images
SET thumbnail_url = image_url
WHERE thumbnail_url IS NULL OR trim(thumbnail_url) = '';

UPDATE storage.buckets
SET public = false
WHERE id IN (
  'expense-receipts',
  'team_chat_uploads',
  'support_chat_uploads',
  'ticket-images'
);

-- expense-receipts: quitar lectura pública (los miembros siguen con expense_receipts_select_org_or_self).
DROP POLICY IF EXISTS "expense_receipts_select_public" ON storage.objects;

-- team_chat_uploads
DROP POLICY IF EXISTS "team_chat_uploads_select_public" ON storage.objects;
DROP POLICY IF EXISTS "team_chat_uploads_select_org_member" ON storage.objects;

CREATE POLICY "team_chat_uploads_select_org_member"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'team_chat_uploads'
    AND (storage.foldername(name))[1]::uuid IN (SELECT public.user_organization_ids())
  );

-- support_chat_uploads
DROP POLICY IF EXISTS "support_chat_uploads_select_public" ON storage.objects;
DROP POLICY IF EXISTS "support_chat_uploads_select_via_message" ON storage.objects;

CREATE POLICY "support_chat_uploads_select_via_message"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'support_chat_uploads'
    AND (
      public.is_super_admin()
      OR EXISTS (
        SELECT 1
        FROM public.support_chat_messages m
        WHERE m.attachment_url IS NOT NULL
          AND trim(m.attachment_url) <> ''
          AND storage.objects.name = trim(m.attachment_url)
          AND m.organization_id IN (SELECT public.user_organization_ids())
      )
    )
  );

-- ticket-images: lectura solo si el ticket pertenece a la org del usuario (o super admin).
DROP POLICY IF EXISTS "Public read ticket images" ON storage.objects;
DROP POLICY IF EXISTS "ticket_images_select_ticket_org" ON storage.objects;

CREATE POLICY "ticket_images_select_ticket_org"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'ticket-images'
    AND (
      public.is_super_admin()
      OR EXISTS (
        SELECT 1
        FROM public.repair_tickets t
        WHERE t.id::text = (storage.foldername(name))[2]
          AND t.organization_id IN (SELECT public.user_organization_ids())
      )
    )
  );

COMMENT ON COLUMN public.chat_messages.attachment_url IS
  'Ruta en bucket team_chat_uploads (primer segmento = organization_id). URL de visualización vía createSignedUrl.';

COMMENT ON COLUMN public.support_chat_messages.attachment_url IS
  'Ruta en bucket support_chat_uploads. URL de visualización vía createSignedUrl.';

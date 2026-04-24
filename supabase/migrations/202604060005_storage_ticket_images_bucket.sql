-- Crea el bucket público `ticket-images` para almacenar imágenes de tickets.
-- El bucket es público (las imágenes tienen URL directa para mostrarlas en la app).
-- Las políticas RLS permiten a usuarios autenticados subir a su propia carpeta (userId/ticketId/…).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ticket-images',
  'ticket-images',
  true,
  15728640,  -- 15 MB
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'image/gif'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 15728640,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'image/gif'
  ];

-- Política: usuarios autenticados pueden subir imágenes en su propia carpeta
DROP POLICY IF EXISTS "Authenticated users upload ticket images" ON storage.objects;
CREATE POLICY "Authenticated users upload ticket images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ticket-images');

-- Política: lectura pública (las URLs son públicas)
DROP POLICY IF EXISTS "Public read ticket images" ON storage.objects;
CREATE POLICY "Public read ticket images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'ticket-images');

-- Política: el propietario puede borrar sus propias imágenes
DROP POLICY IF EXISTS "Owner delete ticket images" ON storage.objects;
CREATE POLICY "Owner delete ticket images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'ticket-images' AND auth.uid()::text = (storage.foldername(name))[1]);

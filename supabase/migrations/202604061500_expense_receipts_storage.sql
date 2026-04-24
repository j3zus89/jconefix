-- Comprobantes de gasto (PDF/imagen) en Storage; `expenses.receipt_url` guarda la ruta dentro del bucket.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'expense-receipts',
  'expense-receipts',
  true,
  10485760, -- 10 MB
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ];

COMMENT ON COLUMN public.expenses.receipt_url IS
  'Ruta en bucket expense-receipts (primer segmento = organization_id o auth.uid() si no hay org).';

-- Subir: carpeta = organización del usuario o su propio user id
DROP POLICY IF EXISTS "expense_receipts_insert_org_or_self" ON storage.objects;
CREATE POLICY "expense_receipts_insert_org_or_self"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'expense-receipts'
    AND (
      (storage.foldername(name))[1]::uuid IN (SELECT public.user_organization_ids())
      OR (storage.foldername(name))[1] = (auth.uid())::text
    )
  );

DROP POLICY IF EXISTS "expense_receipts_select_org_or_self" ON storage.objects;
CREATE POLICY "expense_receipts_select_org_or_self"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'expense-receipts'
    AND (
      (storage.foldername(name))[1]::uuid IN (SELECT public.user_organization_ids())
      OR (storage.foldername(name))[1] = (auth.uid())::text
    )
  );

DROP POLICY IF EXISTS "expense_receipts_delete_org_or_self" ON storage.objects;
CREATE POLICY "expense_receipts_delete_org_or_self"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'expense-receipts'
    AND (
      (storage.foldername(name))[1]::uuid IN (SELECT public.user_organization_ids())
      OR (storage.foldername(name))[1] = (auth.uid())::text
    )
  );

-- Lectura pública opcional (URL directa en navegador); las rutas incluyen UUID difícil de adivinar
DROP POLICY IF EXISTS "expense_receipts_select_public" ON storage.objects;
CREATE POLICY "expense_receipts_select_public"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'expense-receipts');

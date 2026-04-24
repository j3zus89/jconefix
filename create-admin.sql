-- Este script crea el usuario admin en Supabase
-- Ejecutar en: https://supabase.com/dashboard/project/_/sql/new

-- Crear el usuario admin con email y contraseña
-- La contraseña '1989' se hashea automáticamente por Supabase Auth

INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_sent_at,
  is_super_admin
) VALUES (
  gen_random_uuid(),
  'sr.gonzalezcala89@gmail.com',
  crypt('120289', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Administrador", "role": "admin"}',
  now(),
  now(),
  now(),
  true
)
ON CONFLICT (email) DO NOTHING;

-- Verificar que se creó
SELECT id, email, created_at, raw_user_meta_data 
FROM auth.users 
WHERE email = 'sr.gonzalezcala89@gmail.com';

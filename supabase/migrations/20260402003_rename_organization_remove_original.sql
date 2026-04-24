/*
  # Quitar sufijo "Original" del nombre y slug de la organización por defecto

  Alinea el panel (sidebar usa organizations.name) y el slug público con la marca "JC ONE FIX".

  Si ya existe otra fila con slug `jc-one-fix` (p. ej. migración 01004), no se puede asignar
  el mismo slug a la fila "-original": se evita 23505 y solo se alinea el nombre en ese caso.
*/

UPDATE organizations o
SET
  name = 'JC ONE FIX',
  slug = 'jc-one-fix'
WHERE (o.slug = 'jc-one-fix-original' OR o.name = 'JC ONE FIX - Original')
  AND NOT EXISTS (
    SELECT 1
    FROM organizations c
    WHERE c.slug = 'jc-one-fix'
      AND c.id != o.id
  );

UPDATE organizations o
SET name = 'JC ONE FIX'
WHERE (o.slug = 'jc-one-fix-original' OR o.name = 'JC ONE FIX - Original')
  AND EXISTS (
    SELECT 1
    FROM organizations c
    WHERE c.slug = 'jc-one-fix'
      AND c.id != o.id
  );

UPDATE profiles
SET shop_name = 'JC ONE FIX'
WHERE shop_name = 'JC ONE FIX - Original';

UPDATE shop_settings
SET shop_name = 'JC ONE FIX'
WHERE shop_name = 'JC ONE FIX - Original';

COMMENT ON COLUMN organizations.id IS 'Organization UUID — org por defecto de Jesús: JC ONE FIX';

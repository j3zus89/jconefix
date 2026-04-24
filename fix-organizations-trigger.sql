-- Actualizar la función para evitar duplicados
CREATE OR REPLACE FUNCTION create_organization_owner_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO organization_members (organization_id, user_id, role, is_active)
  VALUES (NEW.id, NEW.owner_id, 'owner', true)
  ON CONFLICT (organization_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

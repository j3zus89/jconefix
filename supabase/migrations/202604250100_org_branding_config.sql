-- Configuración de branding personalizado por organización
CREATE TABLE IF NOT EXISTS org_branding_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Logo/Favicon
  favicon_url text,
  logo_url text,
  logo_dark_url text, -- Opcional: versión para modo oscuro
  
  -- Colores personalizados (opcional)
  primary_color text DEFAULT '#0d9488',
  accent_color text DEFAULT '#F5C518',
  
  -- Meta información
  site_title text,
  site_description text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(organization_id)
);

-- Política RLS
ALTER TABLE org_branding_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow owners to manage their org branding"
  ON org_branding_config
  FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_org_branding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_org_branding_timestamp
  BEFORE UPDATE ON org_branding_config
  FOR EACH ROW
  EXECUTE FUNCTION update_org_branding_updated_at();

-- Función para obtener branding (usada en server components)
CREATE OR REPLACE FUNCTION get_org_branding(p_org_id uuid)
RETURNS TABLE (
  favicon_url text,
  logo_url text,
  primary_color text,
  accent_color text,
  site_title text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    obc.favicon_url,
    obc.logo_url,
    obc.primary_color,
    obc.accent_color,
    obc.site_title
  FROM org_branding_config obc
  WHERE obc.organization_id = p_org_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

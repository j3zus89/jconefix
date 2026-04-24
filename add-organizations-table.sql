-- =============================================
-- TABLA: organizations
-- =============================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_status TEXT DEFAULT 'trial',
  subscription_plan TEXT DEFAULT 'basic',
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  max_users INTEGER DEFAULT 5,
  max_tickets INTEGER,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(subscription_status);

-- RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Políticas: Los owners pueden ver su organización
CREATE POLICY "organizations_select" ON organizations FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "organizations_insert" ON organizations FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "organizations_update" ON organizations FOR UPDATE USING (auth.uid() = owner_id);

-- =============================================
-- TABLA: organization_members
-- =============================================
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  is_active BOOLEAN DEFAULT true,
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);

-- RLS
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Políticas: Los miembros pueden ver su membresía
CREATE POLICY "org_members_select" ON organization_members FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "org_members_insert" ON organization_members FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM organizations WHERE id = organization_id AND owner_id = auth.uid())
);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at 
  BEFORE UPDATE ON organizations 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- FUNCIÓN: Crear miembro automáticamente cuando se crea organización
-- =============================================
CREATE OR REPLACE FUNCTION create_organization_owner_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO organization_members (organization_id, user_id, role, is_active)
  VALUES (NEW.id, NEW.owner_id, 'owner', true)
  ON CONFLICT (organization_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_org_owner_member ON organizations;
CREATE TRIGGER trigger_create_org_owner_member
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION create_organization_owner_member();

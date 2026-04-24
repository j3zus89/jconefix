-- Add is_active column to organizations table for MAIA bot
-- This column is used by the MAIA WhatsApp bot to filter active organizations

-- Add is_active column
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Add comment
COMMENT ON COLUMN public.organizations.is_active IS 'Whether the organization is active and can use MAIA services';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON organizations(is_active);

-- Update trigger for updated_at if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

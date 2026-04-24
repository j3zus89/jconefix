-- =============================================
-- TABLAS PARA TICKET DETAIL - JC ONE FIX
-- Fecha: 31 Marzo 2026
-- Tablas: ticket_parts, ticket_inventory_items, ticket_images, ticket_conditions, ticket_accessories
-- =============================================

-- =============================================
-- 1. PIEZAS ADJUNTAS (piezas usadas en la reparación)
-- =============================================
CREATE TABLE IF NOT EXISTS ticket_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    ticket_id UUID REFERENCES repair_tickets(id) ON DELETE CASCADE NOT NULL,
    shop_owner_id UUID REFERENCES auth.users(id) NOT NULL,
    part_name VARCHAR(255) NOT NULL,
    part_number VARCHAR(100),
    description TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
    supplier VARCHAR(255),
    warranty_days INTEGER DEFAULT 0,
    inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL
);

-- =============================================
-- 2. ARTÍCULOS DE INVENTARIO USADOS
-- =============================================
CREATE TABLE IF NOT EXISTS ticket_inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ticket_id UUID REFERENCES repair_tickets(id) ON DELETE CASCADE NOT NULL,
    shop_owner_id UUID REFERENCES auth.users(id) NOT NULL,
    inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE NOT NULL,
    quantity_used INTEGER NOT NULL DEFAULT 1,
    unit_cost DECIMAL(10, 2) NOT NULL,
    total_cost DECIMAL(10, 2) NOT NULL,
    notes TEXT
);

-- =============================================
-- 3. IMÁGENES DEL TICKET (previas/posteriores)
-- =============================================
CREATE TABLE IF NOT EXISTS ticket_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ticket_id UUID REFERENCES repair_tickets(id) ON DELETE CASCADE NOT NULL,
    shop_owner_id UUID REFERENCES auth.users(id) NOT NULL,
    image_type VARCHAR(20) NOT NULL CHECK (image_type IN ('pre_repair', 'post_repair')),
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    description TEXT,
    file_name VARCHAR(255),
    file_size INTEGER,
    uploaded_by VARCHAR(255) DEFAULT 'Sistema'
);

-- =============================================
-- 4. CONDICIONES PREVIAS Y POSTERIORES
-- =============================================
CREATE TABLE IF NOT EXISTS ticket_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    ticket_id UUID REFERENCES repair_tickets(id) ON DELETE CASCADE NOT NULL,
    shop_owner_id UUID REFERENCES auth.users(id) NOT NULL,
    condition_type VARCHAR(50) NOT NULL CHECK (condition_type IN ('pre', 'post')),
    -- Campos de condición (todos opcionales, solo se guardan si se modifican)
    powers_on VARCHAR(20) CHECK (powers_on IN ('yes', 'no', 'unknown')),
    charging VARCHAR(20) CHECK (charging IN ('yes', 'no', 'unknown')),
    restarts VARCHAR(20) CHECK (restarts IN ('yes', 'no', 'unknown')),
    software VARCHAR(20) CHECK (software IN ('working', 'issues', 'unknown')),
    wet_damage VARCHAR(20) CHECK (wet_damage IN ('yes', 'no', 'unknown')),
    tampered VARCHAR(20) CHECK (tampered IN ('yes', 'no', 'unknown')),
    screen_new VARCHAR(20) CHECK (screen_new IN ('yes', 'no', 'unknown')),
    screen_used VARCHAR(20) CHECK (screen_used IN ('yes', 'no', 'unknown')),
    screen_broken VARCHAR(20) CHECK (screen_broken IN ('yes', 'no', 'unknown')),
    chassis_new VARCHAR(20) CHECK (chassis_new IN ('yes', 'no', 'unknown')),
    chassis_used VARCHAR(20) CHECK (chassis_used IN ('yes', 'no', 'unknown')),
    chassis_broken VARCHAR(20) CHECK (chassis_broken IN ('yes', 'no', 'unknown')),
    lens_new VARCHAR(20) CHECK (lens_new IN ('yes', 'no', 'unknown')),
    lens_used VARCHAR(20) CHECK (lens_used IN ('yes', 'no', 'unknown')),
    lens_broken VARCHAR(20) CHECK (lens_broken IN ('yes', 'no', 'unknown')),
    battery_good VARCHAR(20) CHECK (battery_good IN ('yes', 'no', 'unknown')),
    battery_fair VARCHAR(20) CHECK (battery_fair IN ('yes', 'no', 'unknown')),
    battery_bad VARCHAR(20) CHECK (battery_bad IN ('yes', 'no', 'unknown')),
    touchscreen VARCHAR(20) CHECK (touchscreen IN ('working', 'issues', 'unknown')),
    power_button VARCHAR(20) CHECK (power_button IN ('working', 'issues', 'unknown')),
    volume_button VARCHAR(20) CHECK (volume_button IN ('working', 'issues', 'unknown')),
    silent_button VARCHAR(20) CHECK (silent_button IN ('working', 'issues', 'unknown')),
    vibrator VARCHAR(20) CHECK (vibrator IN ('working', 'issues', 'unknown')),
    home_button VARCHAR(20) CHECK (home_button IN ('working', 'issues', 'unknown')),
    face_id VARCHAR(20) CHECK (face_id IN ('working', 'issues', 'unknown')),
    touch_id VARCHAR(20) CHECK (touch_id IN ('working', 'issues', 'unknown')),
    proximity_sensor VARCHAR(20) CHECK (proximity_sensor IN ('working', 'issues', 'unknown')),
    earpiece VARCHAR(20) CHECK (earpiece IN ('working', 'issues', 'unknown')),
    speaker VARCHAR(20) CHECK (speaker IN ('working', 'issues', 'unknown')),
    microphone VARCHAR(20) CHECK (microphone IN ('working', 'issues', 'unknown')),
    front_camera VARCHAR(20) CHECK (front_camera IN ('working', 'issues', 'unknown')),
    back_camera VARCHAR(20) CHECK (back_camera IN ('working', 'issues', 'unknown')),
    wifi VARCHAR(20) CHECK (wifi IN ('working', 'issues', 'unknown')),
    bluetooth VARCHAR(20) CHECK (bluetooth IN ('working', 'issues', 'unknown')),
    coverage VARCHAR(20) CHECK (coverage IN ('working', 'issues', 'unknown')),
    screws VARCHAR(20) CHECK (screws IN ('working', 'issues', 'unknown')),
    notes TEXT,
    checked_by VARCHAR(255)
);

-- =============================================
-- 5. ACCESORIOS/ARTÍCULOS SUMINISTRADOS
-- =============================================
CREATE TABLE IF NOT EXISTS ticket_accessories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    ticket_id UUID REFERENCES repair_tickets(id) ON DELETE CASCADE NOT NULL,
    shop_owner_id UUID REFERENCES auth.users(id) NOT NULL,
    -- Accesorios booleanos
    has_sim BOOLEAN DEFAULT FALSE,
    has_case BOOLEAN DEFAULT FALSE,
    has_pencil BOOLEAN DEFAULT FALSE,
    has_usb_cable BOOLEAN DEFAULT FALSE,
    has_charger BOOLEAN DEFAULT FALSE,
    has_memory_card BOOLEAN DEFAULT FALSE,
    has_power_bank BOOLEAN DEFAULT FALSE,
    has_replacement BOOLEAN DEFAULT FALSE,
    has_headphones BOOLEAN DEFAULT FALSE,
    has_original_box BOOLEAN DEFAULT FALSE,
    notes TEXT
);

-- =============================================
-- ÍNDICES PARA RENDIMIENTO
-- =============================================
CREATE INDEX IF NOT EXISTS idx_ticket_parts_ticket ON ticket_parts(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_parts_inventory ON ticket_parts(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_ticket_inventory_items_ticket ON ticket_inventory_items(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_inventory_items_inventory ON ticket_inventory_items(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_ticket_images_ticket ON ticket_images(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_images_type ON ticket_images(image_type);
CREATE INDEX IF NOT EXISTS idx_ticket_conditions_ticket ON ticket_conditions(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_conditions_type ON ticket_conditions(condition_type);
CREATE INDEX IF NOT EXISTS idx_ticket_accessories_ticket ON ticket_accessories(ticket_id);

-- =============================================
-- RLS POLICIES
-- =============================================
ALTER TABLE ticket_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_accessories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only see their own ticket parts" ON ticket_parts;
DROP POLICY IF EXISTS "Users can only insert their own ticket parts" ON ticket_parts;
DROP POLICY IF EXISTS "Users can only update their own ticket parts" ON ticket_parts;
DROP POLICY IF EXISTS "Users can only delete their own ticket parts" ON ticket_parts;
DROP POLICY IF EXISTS "Users can only see their own ticket inventory items" ON ticket_inventory_items;
DROP POLICY IF EXISTS "Users can only insert their own ticket inventory items" ON ticket_inventory_items;
DROP POLICY IF EXISTS "Users can only delete their own ticket inventory items" ON ticket_inventory_items;
DROP POLICY IF EXISTS "Users can only see their own ticket images" ON ticket_images;
DROP POLICY IF EXISTS "Users can only insert their own ticket images" ON ticket_images;
DROP POLICY IF EXISTS "Users can only delete their own ticket images" ON ticket_images;
DROP POLICY IF EXISTS "Users can only see their own ticket conditions" ON ticket_conditions;
DROP POLICY IF EXISTS "Users can only insert their own ticket conditions" ON ticket_conditions;
DROP POLICY IF EXISTS "Users can only update their own ticket conditions" ON ticket_conditions;
DROP POLICY IF EXISTS "Users can only see their own ticket accessories" ON ticket_accessories;
DROP POLICY IF EXISTS "Users can only insert their own ticket accessories" ON ticket_accessories;
DROP POLICY IF EXISTS "Users can only update their own ticket accessories" ON ticket_accessories;

-- Políticas para ticket_parts
CREATE POLICY "Users can only see their own ticket parts"
    ON ticket_parts FOR SELECT USING (shop_owner_id = auth.uid());
CREATE POLICY "Users can only insert their own ticket parts"
    ON ticket_parts FOR INSERT WITH CHECK (shop_owner_id = auth.uid());
CREATE POLICY "Users can only update their own ticket parts"
    ON ticket_parts FOR UPDATE USING (shop_owner_id = auth.uid());
CREATE POLICY "Users can only delete their own ticket parts"
    ON ticket_parts FOR DELETE USING (shop_owner_id = auth.uid());

-- Políticas para ticket_inventory_items
CREATE POLICY "Users can only see their own ticket inventory items"
    ON ticket_inventory_items FOR SELECT USING (shop_owner_id = auth.uid());
CREATE POLICY "Users can only insert their own ticket inventory items"
    ON ticket_inventory_items FOR INSERT WITH CHECK (shop_owner_id = auth.uid());
CREATE POLICY "Users can only delete their own ticket inventory items"
    ON ticket_inventory_items FOR DELETE USING (shop_owner_id = auth.uid());

-- Políticas para ticket_images
CREATE POLICY "Users can only see their own ticket images"
    ON ticket_images FOR SELECT USING (shop_owner_id = auth.uid());
CREATE POLICY "Users can only insert their own ticket images"
    ON ticket_images FOR INSERT WITH CHECK (shop_owner_id = auth.uid());
CREATE POLICY "Users can only delete their own ticket images"
    ON ticket_images FOR DELETE USING (shop_owner_id = auth.uid());

-- Políticas para ticket_conditions
CREATE POLICY "Users can only see their own ticket conditions"
    ON ticket_conditions FOR SELECT USING (shop_owner_id = auth.uid());
CREATE POLICY "Users can only insert their own ticket conditions"
    ON ticket_conditions FOR INSERT WITH CHECK (shop_owner_id = auth.uid());
CREATE POLICY "Users can only update their own ticket conditions"
    ON ticket_conditions FOR UPDATE USING (shop_owner_id = auth.uid());

-- Políticas para ticket_accessories
CREATE POLICY "Users can only see their own ticket accessories"
    ON ticket_accessories FOR SELECT USING (shop_owner_id = auth.uid());
CREATE POLICY "Users can only insert their own ticket accessories"
    ON ticket_accessories FOR INSERT WITH CHECK (shop_owner_id = auth.uid());
CREATE POLICY "Users can only update their own ticket accessories"
    ON ticket_accessories FOR UPDATE USING (shop_owner_id = auth.uid());

-- =============================================
-- TRIGGER PARA ACTUALIZAR updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a tablas con updated_at
DROP TRIGGER IF EXISTS update_ticket_parts_updated_at ON ticket_parts;
CREATE TRIGGER update_ticket_parts_updated_at
    BEFORE UPDATE ON ticket_parts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ticket_conditions_updated_at ON ticket_conditions;
CREATE TRIGGER update_ticket_conditions_updated_at
    BEFORE UPDATE ON ticket_conditions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ticket_accessories_updated_at ON ticket_accessories;
CREATE TRIGGER update_ticket_accessories_updated_at
    BEFORE UPDATE ON ticket_accessories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- FUNCIÓN PARA CREAR ACCESORIOS POR DEFECTO
-- =============================================
CREATE OR REPLACE FUNCTION create_default_ticket_accessories()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO ticket_accessories (ticket_id, shop_owner_id)
    VALUES (NEW.id, NEW.shop_owner_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para crear registro de accesorios automáticamente
DROP TRIGGER IF EXISTS trigger_create_ticket_accessories ON repair_tickets;
CREATE TRIGGER trigger_create_ticket_accessories
    AFTER INSERT ON repair_tickets
    FOR EACH ROW
    EXECUTE FUNCTION create_default_ticket_accessories();

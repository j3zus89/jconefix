-- =============================================
-- JC ONE FIX - SCHEMA FINAL (SIN ERRORES)
-- =============================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- PRIMERO: Eliminar tablas existentes en orden correcto
-- =============================================
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS ticket_accessories CASCADE;
DROP TABLE IF EXISTS ticket_conditions CASCADE;
DROP TABLE IF EXISTS ticket_images CASCADE;
DROP TABLE IF EXISTS ticket_inventory_items CASCADE;
DROP TABLE IF EXISTS ticket_parts CASCADE;
DROP TABLE IF EXISTS ticket_comments CASCADE;
DROP TABLE IF EXISTS repair_tickets CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS ticket_statuses CASCADE;
DROP TABLE IF EXISTS shop_settings CASCADE;
DROP TABLE IF EXISTS technicians CASCADE;
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- =============================================
-- CREAR TABLAS EN ORDEN CORRECTO
-- =============================================

-- 1. profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  shop_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'owner',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. customers
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID,
  name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  organization TEXT,
  customer_group TEXT DEFAULT 'Individual',
  how_did_you_find_us TEXT,
  tags TEXT,
  tax_class TEXT,
  work_network TEXT,
  address TEXT,
  address2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'España',
  id_type TEXT,
  id_number TEXT,
  drivers_license TEXT,
  mailchimp_status TEXT DEFAULT 'No suscrito',
  contact_person TEXT,
  contact_phone TEXT,
  contact_relation TEXT,
  notes TEXT,
  internal_notes TEXT,
  gdpr_consent BOOLEAN DEFAULT false,
  email_notifications BOOLEAN DEFAULT true,
  mailchimp_subscribed BOOLEAN DEFAULT false,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. inventory_items
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID,
  name TEXT NOT NULL,
  sku TEXT,
  barcode TEXT,
  category TEXT,
  subcategory TEXT,
  brand TEXT,
  model TEXT,
  description TEXT,
  quantity INTEGER DEFAULT 0,
  min_quantity INTEGER DEFAULT 0,
  max_quantity INTEGER,
  cost_price DECIMAL(10,2) DEFAULT 0,
  selling_price DECIMAL(10,2) DEFAULT 0,
  supplier TEXT,
  supplier_code TEXT,
  location TEXT,
  condition TEXT DEFAULT 'new',
  warranty_days INTEGER DEFAULT 0,
  notes TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  is_serialized BOOLEAN DEFAULT false,
  track_inventory BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. repair_tickets
CREATE TABLE repair_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  ticket_number TEXT UNIQUE NOT NULL,
  device_type TEXT NOT NULL,
  device_model TEXT,
  device_category TEXT,
  device_brand TEXT,
  serial_number TEXT,
  imei TEXT,
  pin_pattern TEXT,
  issue_description TEXT NOT NULL,
  diagnostic_notes TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  task_type TEXT DEFAULT 'TIENDA',
  assigned_to TEXT,
  estimated_cost DECIMAL(10,2),
  final_cost DECIMAL(10,2),
  deposit_amount DECIMAL(10,2) DEFAULT 0,
  payment_status TEXT DEFAULT 'pending',
  payment_method TEXT,
  due_date TIMESTAMPTZ,
  is_urgent BOOLEAN DEFAULT false,
  is_draft BOOLEAN DEFAULT false,
  warranty_info TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 5. ticket_comments
CREATE TABLE ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES repair_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  is_private BOOLEAN DEFAULT false,
  comment_type TEXT DEFAULT 'comment',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. technicians
CREATE TABLE technicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'technician',
  permissions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  color TEXT DEFAULT '#1a3a2e',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. shop_settings
CREATE TABLE shop_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID,
  shop_name TEXT DEFAULT 'Mi Taller',
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  currency TEXT DEFAULT 'EUR',
  currency_symbol TEXT DEFAULT '€',
  tax_rate NUMERIC(5,2) DEFAULT 21.00,
  footer_text TEXT,
  logo_url TEXT,
  invoice_prefix TEXT DEFAULT 'F-',
  ticket_prefix TEXT DEFAULT '0-',
  default_warranty TEXT DEFAULT 'Sin garantía',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. ticket_statuses
CREATE TABLE ticket_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6b7280',
  dot_color TEXT NOT NULL DEFAULT '#6b7280',
  category TEXT NOT NULL DEFAULT 'open',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. chat_messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL DEFAULT '',
  sender_color TEXT NOT NULL DEFAULT '#1e40af',
  message TEXT NOT NULL,
  ticket_ref TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. expenses
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID,
  title TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'general',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT DEFAULT '',
  receipt_url TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. ticket_parts
CREATE TABLE ticket_parts (
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

-- 12. ticket_inventory_items
CREATE TABLE ticket_inventory_items (
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

-- 13. ticket_images
CREATE TABLE ticket_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ticket_id UUID REFERENCES repair_tickets(id) ON DELETE CASCADE NOT NULL,
  shop_owner_id UUID REFERENCES auth.users(id) NOT NULL,
  image_type VARCHAR(20) NOT NULL,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  description TEXT,
  file_name VARCHAR(255),
  file_size INTEGER,
  uploaded_by VARCHAR(255) DEFAULT 'Sistema'
);

-- 14. ticket_conditions
CREATE TABLE ticket_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  ticket_id UUID REFERENCES repair_tickets(id) ON DELETE CASCADE NOT NULL,
  shop_owner_id UUID REFERENCES auth.users(id) NOT NULL,
  condition_type VARCHAR(50) NOT NULL,
  powers_on VARCHAR(20),
  charging VARCHAR(20),
  restarts VARCHAR(20),
  software VARCHAR(20),
  wet_damage VARCHAR(20),
  tampered VARCHAR(20),
  screen_new VARCHAR(20),
  screen_used VARCHAR(20),
  screen_broken VARCHAR(20),
  chassis_new VARCHAR(20),
  chassis_used VARCHAR(20),
  chassis_broken VARCHAR(20),
  lens_new VARCHAR(20),
  lens_used VARCHAR(20),
  lens_broken VARCHAR(20),
  battery_good VARCHAR(20),
  battery_fair VARCHAR(20),
  battery_bad VARCHAR(20),
  touchscreen VARCHAR(20),
  power_button VARCHAR(20),
  volume_button VARCHAR(20),
  silent_button VARCHAR(20),
  vibrator VARCHAR(20),
  home_button VARCHAR(20),
  face_id VARCHAR(20),
  touch_id VARCHAR(20),
  proximity_sensor VARCHAR(20),
  earpiece VARCHAR(20),
  speaker VARCHAR(20),
  microphone VARCHAR(20),
  front_camera VARCHAR(20),
  back_camera VARCHAR(20),
  wifi VARCHAR(20),
  bluetooth VARCHAR(20),
  coverage VARCHAR(20),
  screws VARCHAR(20),
  notes TEXT,
  checked_by VARCHAR(255)
);

-- 15. ticket_accessories
CREATE TABLE ticket_accessories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  ticket_id UUID REFERENCES repair_tickets(id) ON DELETE CASCADE NOT NULL,
  shop_owner_id UUID REFERENCES auth.users(id) NOT NULL,
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

-- 16. sales
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID,
  customer_id UUID REFERENCES customers(id),
  ticket_id UUID REFERENCES repair_tickets(id),
  sale_number TEXT,
  subtotal DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  payment_method TEXT,
  payment_status TEXT DEFAULT 'paid',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. sale_items
CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES inventory_items(id),
  description TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10,2) DEFAULT 0,
  total_price DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- HABILITAR RLS EN TODAS LAS TABLAS
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_accessories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLÍTICAS RLS
-- =============================================

-- profiles
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- customers
CREATE POLICY "customers_select" ON customers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "customers_insert" ON customers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "customers_update" ON customers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "customers_delete" ON customers FOR DELETE USING (auth.uid() = user_id);

-- inventory_items
CREATE POLICY "inventory_select" ON inventory_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "inventory_insert" ON inventory_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "inventory_update" ON inventory_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "inventory_delete" ON inventory_items FOR DELETE USING (auth.uid() = user_id);

-- repair_tickets
CREATE POLICY "tickets_select" ON repair_tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tickets_insert" ON repair_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tickets_update" ON repair_tickets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "tickets_delete" ON repair_tickets FOR DELETE USING (auth.uid() = user_id);

-- technicians
CREATE POLICY "technicians_select" ON technicians FOR SELECT USING (auth.uid() = shop_owner_id);
CREATE POLICY "technicians_insert" ON technicians FOR INSERT WITH CHECK (auth.uid() = shop_owner_id);
CREATE POLICY "technicians_update" ON technicians FOR UPDATE USING (auth.uid() = shop_owner_id);
CREATE POLICY "technicians_delete" ON technicians FOR DELETE USING (auth.uid() = shop_owner_id);

-- shop_settings
CREATE POLICY "settings_select" ON shop_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "settings_insert" ON shop_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "settings_update" ON shop_settings FOR UPDATE USING (auth.uid() = user_id);

-- ticket_statuses
CREATE POLICY "statuses_select" ON ticket_statuses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "statuses_insert" ON ticket_statuses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "statuses_update" ON ticket_statuses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "statuses_delete" ON ticket_statuses FOR DELETE USING (auth.uid() = user_id);

-- chat_messages
CREATE POLICY "chat_select" ON chat_messages FOR SELECT USING (true);
CREATE POLICY "chat_insert" ON chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- expenses
CREATE POLICY "expenses_select" ON expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "expenses_insert" ON expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "expenses_update" ON expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "expenses_delete" ON expenses FOR DELETE USING (auth.uid() = user_id);

-- ticket_parts
CREATE POLICY "parts_select" ON ticket_parts FOR SELECT USING (shop_owner_id = auth.uid());
CREATE POLICY "parts_insert" ON ticket_parts FOR INSERT WITH CHECK (shop_owner_id = auth.uid());
CREATE POLICY "parts_update" ON ticket_parts FOR UPDATE USING (shop_owner_id = auth.uid());
CREATE POLICY "parts_delete" ON ticket_parts FOR DELETE USING (shop_owner_id = auth.uid());

-- ticket_inventory_items
CREATE POLICY "inv_items_select" ON ticket_inventory_items FOR SELECT USING (shop_owner_id = auth.uid());
CREATE POLICY "inv_items_insert" ON ticket_inventory_items FOR INSERT WITH CHECK (shop_owner_id = auth.uid());

-- ticket_images
CREATE POLICY "images_select" ON ticket_images FOR SELECT USING (shop_owner_id = auth.uid());
CREATE POLICY "images_insert" ON ticket_images FOR INSERT WITH CHECK (shop_owner_id = auth.uid());

-- ticket_conditions
CREATE POLICY "conditions_select" ON ticket_conditions FOR SELECT USING (shop_owner_id = auth.uid());
CREATE POLICY "conditions_insert" ON ticket_conditions FOR INSERT WITH CHECK (shop_owner_id = auth.uid());
CREATE POLICY "conditions_update" ON ticket_conditions FOR UPDATE USING (shop_owner_id = auth.uid());

-- ticket_accessories
CREATE POLICY "accessories_select" ON ticket_accessories FOR SELECT USING (shop_owner_id = auth.uid());
CREATE POLICY "accessories_insert" ON ticket_accessories FOR INSERT WITH CHECK (shop_owner_id = auth.uid());
CREATE POLICY "accessories_update" ON ticket_accessories FOR UPDATE USING (shop_owner_id = auth.uid());

-- sales
CREATE POLICY "sales_select" ON sales FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sales_insert" ON sales FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sales_update" ON sales FOR UPDATE USING (auth.uid() = user_id);

-- sale_items (via sales)
CREATE POLICY "sale_items_select" ON sale_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM sales WHERE sales.id = sale_items.sale_id AND sales.user_id = auth.uid())
);
CREATE POLICY "sale_items_insert" ON sale_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM sales WHERE sales.id = sale_items.sale_id AND sales.user_id = auth.uid())
);

-- ticket_comments (via repair_tickets)
CREATE POLICY "comments_select" ON ticket_comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM repair_tickets WHERE repair_tickets.id = ticket_comments.ticket_id AND repair_tickets.user_id = auth.uid())
);
CREATE POLICY "comments_insert" ON ticket_comments FOR INSERT WITH CHECK (
  auth.uid() = user_id AND EXISTS (SELECT 1 FROM repair_tickets WHERE repair_tickets.id = ticket_comments.ticket_id AND repair_tickets.user_id = auth.uid())
);

-- =============================================
-- ÍNDICES
-- =============================================
CREATE INDEX idx_customers_user ON customers(user_id);
CREATE INDEX idx_inventory_user ON inventory_items(user_id);
CREATE INDEX idx_tickets_user ON repair_tickets(user_id);
CREATE INDEX idx_tickets_customer ON repair_tickets(customer_id);
CREATE INDEX idx_tickets_status ON repair_tickets(status);
CREATE INDEX idx_tickets_number ON repair_tickets(ticket_number);
CREATE INDEX idx_sales_user ON sales(user_id);

-- =============================================
-- FIN
-- =============================================

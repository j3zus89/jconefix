-- Migración: Catálogo maestro de servicios de reparación
-- Objetivo: Crear tabla maestra con todos los servicios por defecto y función para copiar a organizaciones nuevas
-- Fecha: 2026-04-24

-- ============================================
-- 1. TABLA MAESTRA DEL CATÁLOGO
-- ============================================

CREATE TABLE IF NOT EXISTS public.service_catalog_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Campos del servicio
    category TEXT NOT NULL,
    brand TEXT NOT NULL,
    model TEXT NOT NULL DEFAULT '(Todos los modelos)',
    service_name TEXT NOT NULL,
    price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    show_in_widget BOOLEAN NOT NULL DEFAULT FALSE,
    country_code TEXT NOT NULL DEFAULT 'AR',
    repair_type_code TEXT NOT NULL DEFAULT '',
    pricing_year INTEGER NOT NULL DEFAULT 2026,
    source TEXT NOT NULL DEFAULT 'catalog_master',
    -- Metadatos
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 0
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_service_catalog_master_category ON public.service_catalog_master (category);
CREATE INDEX IF NOT EXISTS idx_service_catalog_master_brand ON public.service_catalog_master (brand);
CREATE INDEX IF NOT EXISTS idx_service_catalog_master_country ON public.service_catalog_master (country_code);
CREATE INDEX IF NOT EXISTS idx_service_catalog_master_active ON public.service_catalog_master (is_active);

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_service_catalog_master_updated_at ON public.service_catalog_master;
CREATE TRIGGER update_service_catalog_master_updated_at
    BEFORE UPDATE ON public.service_catalog_master
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 2. INSERTAR CATÁLOGO 2026 (ARGENTINA - ARS)
-- ============================================
-- Basado en los tarifarios de repair-labor-tariffs-2026.ts

-- Precios base por tier
DO $$
BEGIN
    -- Limpiar catálogo existente para evitar duplicados
    DELETE FROM public.service_catalog_master WHERE source = 'catalog_master' AND country_code = 'AR';

    -- ============================================
    -- SMARTPHONES - Apple (con modelos específicos)
    -- ============================================
    -- Precios base para smartphones
    -- mobile_screen: 128000, mobile_battery: 58000, etc.
    
    -- Apple iPhone SE (2016) / 6(s) - Tier 1
    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Smartphones', 'Apple', 'iPhone SE (2016)', 'Cambio de pantalla', 74200, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Apple', 'iPhone SE (2016)', 'Cambio de batería', 30200, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Apple', 'iPhone SE (2016)', 'Reparación puerto de carga', 39600, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Apple', 'iPhone SE (2016)', 'Micrófono / altavoz', 35200, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Apple', 'iPhone SE (2016)', 'Reparación cámara', 37400, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Apple', 'iPhone SE (2016)', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Apple', 'iPhone SE (2016)', 'Limpieza por líquido', 63400, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Apple', 'iPhone SE (2016)', 'Botones / flex', 33400, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Apple', 'iPhone SE (2016)', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Apple', 'iPhone SE (2016)', 'Reparación placa base', 73500, 'AR', 'mobile_board', 10);

    -- Apple iPhone 6 Plus
    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Smartphones', 'Apple', 'iPhone 6 Plus', 'Cambio de pantalla', 85500, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Apple', 'iPhone 6 Plus', 'Cambio de batería', 34800, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Apple', 'iPhone 6 Plus', 'Reparación puerto de carga', 41000, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Apple', 'iPhone 6 Plus', 'Micrófono / altavoz', 35800, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Apple', 'iPhone 6 Plus', 'Reparación cámara', 38800, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Apple', 'iPhone 6 Plus', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Apple', 'iPhone 6 Plus', 'Limpieza por líquido', 64500, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Apple', 'iPhone 6 Plus', 'Botones / flex', 34200, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Apple', 'iPhone 6 Plus', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Apple', 'iPhone 6 Plus', 'Reparación placa base', 76500, 'AR', 'mobile_board', 10);

    -- Apple iPhone 6s / 6s Plus
    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Smartphones', 'Apple', 'iPhone 6s', 'Cambio de pantalla', 74200, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Apple', 'iPhone 6s', 'Cambio de batería', 30200, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Apple', 'iPhone 6s', 'Reparación puerto de carga', 39600, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Apple', 'iPhone 6s', 'Micrófono / altavoz', 35200, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Apple', 'iPhone 6s', 'Reparación cámara', 37400, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Apple', 'iPhone 6s', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Apple', 'iPhone 6s', 'Limpieza por líquido', 63400, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Apple', 'iPhone 6s', 'Botones / flex', 33400, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Apple', 'iPhone 6s', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Apple', 'iPhone 6s', 'Reparación placa base', 73500, 'AR', 'mobile_board', 10),
    ('Smartphones', 'Apple', 'iPhone 6s Plus', 'Cambio de pantalla', 85500, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Apple', 'iPhone 6s Plus', 'Cambio de batería', 34800, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Apple', 'iPhone 6s Plus', 'Reparación puerto de carga', 41000, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Apple', 'iPhone 6s Plus', 'Micrófono / altavoz', 35800, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Apple', 'iPhone 6s Plus', 'Reparación cámara', 38800, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Apple', 'iPhone 6s Plus', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Apple', 'iPhone 6s Plus', 'Limpieza por líquido', 64500, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Apple', 'iPhone 6s Plus', 'Botones / flex', 34200, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Apple', 'iPhone 6s Plus', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Apple', 'iPhone 6s Plus', 'Reparación placa base', 76500, 'AR', 'mobile_board', 10);

    -- Apple iPhone 7 / 7 Plus (Tier 2)
    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Smartphones', 'Apple', 'iPhone 7', 'Cambio de pantalla', 84500, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Apple', 'iPhone 7', 'Cambio de batería', 34800, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Apple', 'iPhone 7', 'Reparación puerto de carga', 40500, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Apple', 'iPhone 7', 'Micrófono / altavoz', 36800, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Apple', 'iPhone 7', 'Reparación cámara', 41600, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Apple', 'iPhone 7', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Apple', 'iPhone 7', 'Limpieza por líquido', 64800, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Apple', 'iPhone 7', 'Botones / flex', 34600, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Apple', 'iPhone 7', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Apple', 'iPhone 7', 'Reparación placa base', 79800, 'AR', 'mobile_board', 10),
    ('Smartphones', 'Apple', 'iPhone 7 Plus', 'Cambio de pantalla', 95500, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Apple', 'iPhone 7 Plus', 'Cambio de batería', 40000, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Apple', 'iPhone 7 Plus', 'Reparación puerto de carga', 42500, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Apple', 'iPhone 7 Plus', 'Micrófono / altavoz', 38000, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Apple', 'iPhone 7 Plus', 'Reparación cámara', 43500, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Apple', 'iPhone 7 Plus', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Apple', 'iPhone 7 Plus', 'Limpieza por líquido', 66500, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Apple', 'iPhone 7 Plus', 'Botones / flex', 35800, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Apple', 'iPhone 7 Plus', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Apple', 'iPhone 7 Plus', 'Reparación placa base', 83000, 'AR', 'mobile_board', 10);

    -- Apple iPhone 8 / 8 Plus
    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Smartphones', 'Apple', 'iPhone 8', 'Cambio de pantalla', 84500, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Apple', 'iPhone 8', 'Cambio de batería', 34800, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Apple', 'iPhone 8', 'Reparación puerto de carga', 40500, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Apple', 'iPhone 8', 'Micrófono / altavoz', 36800, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Apple', 'iPhone 8', 'Reparación cámara', 41600, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Apple', 'iPhone 8', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Apple', 'iPhone 8', 'Limpieza por líquido', 64800, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Apple', 'iPhone 8', 'Botones / flex', 34600, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Apple', 'iPhone 8', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Apple', 'iPhone 8', 'Reparación placa base', 79800, 'AR', 'mobile_board', 10),
    ('Smartphones', 'Apple', 'iPhone 8 Plus', 'Cambio de pantalla', 95500, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Apple', 'iPhone 8 Plus', 'Cambio de batería', 40000, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Apple', 'iPhone 8 Plus', 'Reparación puerto de carga', 42500, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Apple', 'iPhone 8 Plus', 'Micrófono / altavoz', 38000, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Apple', 'iPhone 8 Plus', 'Reparación cámara', 43500, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Apple', 'iPhone 8 Plus', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Apple', 'iPhone 8 Plus', 'Limpieza por líquido', 66500, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Apple', 'iPhone 8 Plus', 'Botones / flex', 35800, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Apple', 'iPhone 8 Plus', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Apple', 'iPhone 8 Plus', 'Reparación placa base', 83000, 'AR', 'mobile_board', 10);

    -- iPhone SE 2ª y 3ª gen
    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Smartphones', 'Apple', 'iPhone SE (2ª gen)', 'Cambio de pantalla', 84500, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Apple', 'iPhone SE (2ª gen)', 'Cambio de batería', 34800, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Apple', 'iPhone SE (2ª gen)', 'Reparación puerto de carga', 40500, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Apple', 'iPhone SE (2ª gen)', 'Micrófono / altavoz', 36800, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Apple', 'iPhone SE (2ª gen)', 'Reparación cámara', 41600, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Apple', 'iPhone SE (2ª gen)', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Apple', 'iPhone SE (2ª gen)', 'Limpieza por líquido', 64800, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Apple', 'iPhone SE (2ª gen)', 'Botones / flex', 34600, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Apple', 'iPhone SE (2ª gen)', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Apple', 'iPhone SE (2ª gen)', 'Reparación placa base', 79800, 'AR', 'mobile_board', 10),
    ('Smartphones', 'Apple', 'iPhone SE (3ª gen)', 'Cambio de pantalla', 84500, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Apple', 'iPhone SE (3ª gen)', 'Cambio de batería', 34800, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Apple', 'iPhone SE (3ª gen)', 'Reparación puerto de carga', 40500, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Apple', 'iPhone SE (3ª gen)', 'Micrófono / altavoz', 36800, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Apple', 'iPhone SE (3ª gen)', 'Reparación cámara', 41600, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Apple', 'iPhone SE (3ª gen)', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Apple', 'iPhone SE (3ª gen)', 'Limpieza por líquido', 64800, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Apple', 'iPhone SE (3ª gen)', 'Botones / flex', 34600, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Apple', 'iPhone SE (3ª gen)', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Apple', 'iPhone SE (3ª gen)', 'Reparación placa base', 79800, 'AR', 'mobile_board', 10);

    -- iPhone X / XR / XS / XS Max (Tier 3)
    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Smartphones', 'Apple', 'iPhone X', 'Cambio de pantalla', 105000, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Apple', 'iPhone X', 'Cambio de batería', 44000, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Apple', 'iPhone X', 'Reparación puerto de carga', 42300, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Apple', 'iPhone X', 'Micrófono / altavoz', 38400, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Apple', 'iPhone X', 'Reparación cámara', 46800, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Apple', 'iPhone X', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Apple', 'iPhone X', 'Limpieza por líquido', 67700, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Apple', 'iPhone X', 'Botones / flex', 36100, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Apple', 'iPhone X', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Apple', 'iPhone X', 'Reparación placa base', 92400, 'AR', 'mobile_board', 10),
    ('Smartphones', 'Apple', 'iPhone XR', 'Cambio de pantalla', 105000, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Apple', 'iPhone XR', 'Cambio de batería', 44000, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Apple', 'iPhone XR', 'Reparación puerto de carga', 42300, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Apple', 'iPhone XR', 'Micrófono / altavoz', 38400, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Apple', 'iPhone XR', 'Reparación cámara', 46800, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Apple', 'iPhone XR', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Apple', 'iPhone XR', 'Limpieza por líquido', 67700, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Apple', 'iPhone XR', 'Botones / flex', 36100, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Apple', 'iPhone XR', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Apple', 'iPhone XR', 'Reparación placa base', 92400, 'AR', 'mobile_board', 10),
    ('Smartphones', 'Apple', 'iPhone XS', 'Cambio de pantalla', 105000, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Apple', 'iPhone XS', 'Cambio de batería', 44000, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Apple', 'iPhone XS', 'Reparación puerto de carga', 42300, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Apple', 'iPhone XS', 'Micrófono / altavoz', 38400, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Apple', 'iPhone XS', 'Reparación cámara', 46800, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Apple', 'iPhone XS', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Apple', 'iPhone XS', 'Limpieza por líquido', 67700, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Apple', 'iPhone XS', 'Botones / flex', 36100, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Apple', 'iPhone XS', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Apple', 'iPhone XS', 'Reparación placa base', 92400, 'AR', 'mobile_board', 10),
    ('Smartphones', 'Apple', 'iPhone XS Max', 'Cambio de pantalla', 116500, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Apple', 'iPhone XS Max', 'Cambio de batería', 48600, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Apple', 'iPhone XS Max', 'Reparación puerto de carga', 43800, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Apple', 'iPhone XS Max', 'Micrófono / altavoz', 39600, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Apple', 'iPhone XS Max', 'Reparación cámara', 48900, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Apple', 'iPhone XS Max', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Apple', 'iPhone XS Max', 'Limpieza por líquido', 69600, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Apple', 'iPhone XS Max', 'Botones / flex', 37000, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Apple', 'iPhone XS Max', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Apple', 'iPhone XS Max', 'Reparación placa base', 95700, 'AR', 'mobile_board', 10);

    -- iPhone 11 / 11 Pro / 11 Pro Max
    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Smartphones', 'Apple', 'iPhone 11', 'Cambio de pantalla', 105000, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Apple', 'iPhone 11', 'Cambio de batería', 44000, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Apple', 'iPhone 11', 'Reparación puerto de carga', 42300, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Apple', 'iPhone 11', 'Micrófono / altavoz', 38400, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Apple', 'iPhone 11', 'Reparación cámara', 46800, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Apple', 'iPhone 11', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Apple', 'iPhone 11', 'Limpieza por líquido', 67700, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Apple', 'iPhone 11', 'Botones / flex', 36100, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Apple', 'iPhone 11', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Apple', 'iPhone 11', 'Reparación placa base', 92400, 'AR', 'mobile_board', 10),
    ('Smartphones', 'Apple', 'iPhone 11 Pro', 'Cambio de pantalla', 105000, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Apple', 'iPhone 11 Pro', 'Cambio de batería', 44000, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Apple', 'iPhone 11 Pro', 'Reparación puerto de carga', 42300, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Apple', 'iPhone 11 Pro', 'Micrófono / altavoz', 38400, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Apple', 'iPhone 11 Pro', 'Reparación cámara', 46800, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Apple', 'iPhone 11 Pro', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Apple', 'iPhone 11 Pro', 'Limpieza por líquido', 67700, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Apple', 'iPhone 11 Pro', 'Botones / flex', 36100, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Apple', 'iPhone 11 Pro', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Apple', 'iPhone 11 Pro', 'Reparación placa base', 92400, 'AR', 'mobile_board', 10),
    ('Smartphones', 'Apple', 'iPhone 11 Pro Max', 'Cambio de pantalla', 116500, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Apple', 'iPhone 11 Pro Max', 'Cambio de batería', 48600, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Apple', 'iPhone 11 Pro Max', 'Reparación puerto de carga', 43800, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Apple', 'iPhone 11 Pro Max', 'Micrófono / altavoz', 39600, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Apple', 'iPhone 11 Pro Max', 'Reparación cámara', 48900, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Apple', 'iPhone 11 Pro Max', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Apple', 'iPhone 11 Pro Max', 'Limpieza por líquido', 69600, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Apple', 'iPhone 11 Pro Max', 'Botones / flex', 37000, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Apple', 'iPhone 11 Pro Max', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Apple', 'iPhone 11 Pro Max', 'Reparación placa base', 95700, 'AR', 'mobile_board', 10);

    -- iPhone 12 series (Tier 4)
    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Smartphones', 'Apple', 'iPhone 12 mini', 'Cambio de pantalla', 128000, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Apple', 'iPhone 12 mini', 'Cambio de batería', 58000, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Apple', 'iPhone 12 mini', 'Reparación puerto de carga', 45000, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Apple', 'iPhone 12 mini', 'Micrófono / altavoz', 40000, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Apple', 'iPhone 12 mini', 'Reparación cámara', 52000, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Apple', 'iPhone 12 mini', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Apple', 'iPhone 12 mini', 'Limpieza por líquido', 72000, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Apple', 'iPhone 12 mini', 'Botones / flex', 38000, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Apple', 'iPhone 12 mini', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Apple', 'iPhone 12 mini', 'Reparación placa base', 105000, 'AR', 'mobile_board', 10),
    ('Smartphones', 'Apple', 'iPhone 12', 'Cambio de pantalla', 128000, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Apple', 'iPhone 12', 'Cambio de batería', 58000, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Apple', 'iPhone 12', 'Reparación puerto de carga', 45000, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Apple', 'iPhone 12', 'Micrófono / altavoz', 40000, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Apple', 'iPhone 12', 'Reparación cámara', 52000, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Apple', 'iPhone 12', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Apple', 'iPhone 12', 'Limpieza por líquido', 72000, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Apple', 'iPhone 12', 'Botones / flex', 38000, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Apple', 'iPhone 12', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Apple', 'iPhone 12', 'Reparación placa base', 105000, 'AR', 'mobile_board', 10),
    ('Smartphones', 'Apple', 'iPhone 12 Pro', 'Cambio de pantalla', 128000, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Apple', 'iPhone 12 Pro', 'Cambio de batería', 58000, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Apple', 'iPhone 12 Pro', 'Reparación puerto de carga', 45000, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Apple', 'iPhone 12 Pro', 'Micrófono / altavoz', 40000, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Apple', 'iPhone 12 Pro', 'Reparación cámara', 52000, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Apple', 'iPhone 12 Pro', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Apple', 'iPhone 12 Pro', 'Limpieza por líquido', 72000, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Apple', 'iPhone 12 Pro', 'Botones / flex', 38000, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Apple', 'iPhone 12 Pro', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Apple', 'iPhone 12 Pro', 'Reparación placa base', 105000, 'AR', 'mobile_board', 10),
    ('Smartphones', 'Apple', 'iPhone 12 Pro Max', 'Cambio de pantalla', 142000, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Apple', 'iPhone 12 Pro Max', 'Cambio de batería', 64000, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Apple', 'iPhone 12 Pro Max', 'Reparación puerto de carga', 46500, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Apple', 'iPhone 12 Pro Max', 'Micrófono / altavoz', 41200, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Apple', 'iPhone 12 Pro Max', 'Reparación cámara', 54700, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Apple', 'iPhone 12 Pro Max', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Apple', 'iPhone 12 Pro Max', 'Limpieza por líquido', 73800, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Apple', 'iPhone 12 Pro Max', 'Botones / flex', 39000, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Apple', 'iPhone 12 Pro Max', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Apple', 'iPhone 12 Pro Max', 'Reparación placa base', 108800, 'AR', 'mobile_board', 10);

    -- iPhone 13 series
    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Smartphones', 'Apple', 'iPhone 13 mini', 'Cambio de pantalla', 128000, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Apple', 'iPhone 13 mini', 'Cambio de batería', 58000, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Apple', 'iPhone 13 mini', 'Reparación puerto de carga', 45000, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Apple', 'iPhone 13 mini', 'Micrófono / altavoz', 40000, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Apple', 'iPhone 13 mini', 'Reparación cámara', 52000, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Apple', 'iPhone 13 mini', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Apple', 'iPhone 13 mini', 'Limpieza por líquido', 72000, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Apple', 'iPhone 13 mini', 'Botones / flex', 38000, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Apple', 'iPhone 13 mini', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Apple', 'iPhone 13 mini', 'Reparación placa base', 105000, 'AR', 'mobile_board', 10),
    ('Smartphones', 'Apple', 'iPhone 13', 'Cambio de pantalla', 128000, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Apple', 'iPhone 13', 'Cambio de batería', 58000, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Apple', 'iPhone 13', 'Reparación puerto de carga', 45000, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Apple', 'iPhone 13', 'Micrófono / altavoz', 40000, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Apple', 'iPhone 13', 'Reparación cámara', 52000, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Apple', 'iPhone 13', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Apple', 'iPhone 13', 'Limpieza por líquido', 72000, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Apple', 'iPhone 13', 'Botones / flex', 38000, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Apple', 'iPhone 13', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Apple', 'iPhone 13', 'Reparación placa base', 105000, 'AR', 'mobile_board', 10),
    ('Smartphones', 'Apple', 'iPhone 13 Pro', 'Cambio de pantalla', 128000, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Apple', 'iPhone 13 Pro', 'Cambio de batería', 58000, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Apple', 'iPhone 13 Pro', 'Reparación puerto de carga', 45000, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Apple', 'iPhone 13 Pro', 'Micrófono / altavoz', 40000, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Apple', 'iPhone 13 Pro', 'Reparación cámara', 52000, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Apple', 'iPhone 13 Pro', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Apple', 'iPhone 13 Pro', 'Limpieza por líquido', 72000, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Apple', 'iPhone 13 Pro', 'Botones / flex', 38000, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Apple', 'iPhone 13 Pro', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Apple', 'iPhone 13 Pro', 'Reparación placa base', 105000, 'AR', 'mobile_board', 10),
    ('Smartphones', 'Apple', 'iPhone 13 Pro Max', 'Cambio de pantalla', 142000, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Apple', 'iPhone 13 Pro Max', 'Cambio de batería', 64000, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Apple', 'iPhone 13 Pro Max', 'Reparación puerto de carga', 46500, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Apple', 'iPhone 13 Pro Max', 'Micrófono / altavoz', 41200, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Apple', 'iPhone 13 Pro Max', 'Reparación cámara', 54700, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Apple', 'iPhone 13 Pro Max', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Apple', 'iPhone 13 Pro Max', 'Limpieza por líquido', 73800, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Apple', 'iPhone 13 Pro Max', 'Botones / flex', 39000, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Apple', 'iPhone 13 Pro Max', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Apple', 'iPhone 13 Pro Max', 'Reparación placa base', 108800, 'AR', 'mobile_board', 10);

    -- iPhone 14 series (Tier 5)
    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Smartphones', 'Apple', 'iPhone 14', 'Cambio de pantalla', 171500, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Apple', 'iPhone 14', 'Cambio de batería', 70800, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Apple', 'iPhone 14', 'Reparación puerto de carga', 47700, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Apple', 'iPhone 14', 'Micrófono / altavoz', 42000, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Apple', 'iPhone 14', 'Reparación cámara', 61400, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Apple', 'iPhone 14', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Apple', 'iPhone 14', 'Limpieza por líquido', 76300, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Apple', 'iPhone 14', 'Botones / flex', 39900, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Apple', 'iPhone 14', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Apple', 'iPhone 14', 'Reparación placa base', 134400, 'AR', 'mobile_board', 10),
    ('Smartphones', 'Apple', 'iPhone 14 Plus', 'Cambio de pantalla', 185500, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Apple', 'iPhone 14 Plus', 'Cambio de batería', 76400, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Apple', 'iPhone 14 Plus', 'Reparación puerto de carga', 49200, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Apple', 'iPhone 14 Plus', 'Micrófono / altavoz', 43200, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Apple', 'iPhone 14 Plus', 'Reparación cámara', 64300, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Apple', 'iPhone 14 Plus', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Apple', 'iPhone 14 Plus', 'Limpieza por líquido', 78100, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Apple', 'iPhone 14 Plus', 'Botones / flex', 40800, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Apple', 'iPhone 14 Plus', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Apple', 'iPhone 14 Plus', 'Reparación placa base', 138300, 'AR', 'mobile_board', 10),
    ('Smartphones', 'Apple', 'iPhone 14 Pro', 'Cambio de pantalla', 171500, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Apple', 'iPhone 14 Pro', 'Cambio de batería', 70800, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Apple', 'iPhone 14 Pro', 'Reparación puerto de carga', 47700, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Apple', 'iPhone 14 Pro', 'Micrófono / altavoz', 42000, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Apple', 'iPhone 14 Pro', 'Reparación cámara', 61400, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Apple', 'iPhone 14 Pro', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Apple', 'iPhone 14 Pro', 'Limpieza por líquido', 76300, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Apple', 'iPhone 14 Pro', 'Botones / flex', 39900, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Apple', 'iPhone 14 Pro', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Apple', 'iPhone 14 Pro', 'Reparación placa base', 134400, 'AR', 'mobile_board', 10),
    ('Smartphones', 'Apple', 'iPhone 14 Pro Max', 'Cambio de pantalla', 185500, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Apple', 'iPhone 14 Pro Max', 'Cambio de batería', 76400, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Apple', 'iPhone 14 Pro Max', 'Reparación puerto de carga', 49200, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Apple', 'iPhone 14 Pro Max', 'Micrófono / altavoz', 43200, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Apple', 'iPhone 14 Pro Max', 'Reparación cámara', 64300, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Apple', 'iPhone 14 Pro Max', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Apple', 'iPhone 14 Pro Max', 'Limpieza por líquido', 78100, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Apple', 'iPhone 14 Pro Max', 'Botones / flex', 40800, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Apple', 'iPhone 14 Pro Max', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Apple', 'iPhone 14 Pro Max', 'Reparación placa base', 138300, 'AR', 'mobile_board', 10);

    -- iPhone 15 series
    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Smartphones', 'Apple', 'iPhone 15', 'Cambio de pantalla', 171500, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Apple', 'iPhone 15', 'Cambio de batería', 70800, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Apple', 'iPhone 15', 'Reparación puerto de carga', 47700, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Apple', 'iPhone 15', 'Micrófono / altavoz', 42000, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Apple', 'iPhone 15', 'Reparación cámara', 61400, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Apple', 'iPhone 15', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Apple', 'iPhone 15', 'Limpieza por líquido', 76300, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Apple', 'iPhone 15', 'Botones / flex', 39900, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Apple', 'iPhone 15', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Apple', 'iPhone 15', 'Reparación placa base', 134400, 'AR', 'mobile_board', 10),
    ('Smartphones', 'Apple', 'iPhone 15 Plus', 'Cambio de pantalla', 185500, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Apple', 'iPhone 15 Plus', 'Cambio de batería', 76400, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Apple', 'iPhone 15 Plus', 'Reparación puerto de carga', 49200, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Apple', 'iPhone 15 Plus', 'Micrófono / altavoz', 43200, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Apple', 'iPhone 15 Plus', 'Reparación cámara', 64300, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Apple', 'iPhone 15 Plus', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Apple', 'iPhone 15 Plus', 'Limpieza por líquido', 78100, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Apple', 'iPhone 15 Plus', 'Botones / flex', 40800, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Apple', 'iPhone 15 Plus', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Apple', 'iPhone 15 Plus', 'Reparación placa base', 138300, 'AR', 'mobile_board', 10),
    ('Smartphones', 'Apple', 'iPhone 15 Pro', 'Cambio de pantalla', 171500, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Apple', 'iPhone 15 Pro', 'Cambio de batería', 70800, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Apple', 'iPhone 15 Pro', 'Reparación puerto de carga', 47700, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Apple', 'iPhone 15 Pro', 'Micrófono / altavoz', 42000, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Apple', 'iPhone 15 Pro', 'Reparación cámara', 61400, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Apple', 'iPhone 15 Pro', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Apple', 'iPhone 15 Pro', 'Limpieza por líquido', 76300, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Apple', 'iPhone 15 Pro', 'Botones / flex', 39900, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Apple', 'iPhone 15 Pro', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Apple', 'iPhone 15 Pro', 'Reparación placa base', 134400, 'AR', 'mobile_board', 10),
    ('Smartphones', 'Apple', 'iPhone 15 Pro Max', 'Cambio de pantalla', 185500, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Apple', 'iPhone 15 Pro Max', 'Cambio de batería', 76400, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Apple', 'iPhone 15 Pro Max', 'Reparación puerto de carga', 49200, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Apple', 'iPhone 15 Pro Max', 'Micrófono / altavoz', 43200, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Apple', 'iPhone 15 Pro Max', 'Reparación cámara', 64300, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Apple', 'iPhone 15 Pro Max', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Apple', 'iPhone 15 Pro Max', 'Limpieza por líquido', 78100, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Apple', 'iPhone 15 Pro Max', 'Botones / flex', 40800, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Apple', 'iPhone 15 Pro Max', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Apple', 'iPhone 15 Pro Max', 'Reparación placa base', 138300, 'AR', 'mobile_board', 10);

    -- iPhone 16 series
    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Smartphones', 'Apple', 'iPhone 16', 'Cambio de pantalla', 171500, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Apple', 'iPhone 16', 'Cambio de batería', 70800, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Apple', 'iPhone 16', 'Reparación puerto de carga', 47700, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Apple', 'iPhone 16', 'Micrófono / altavoz', 42000, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Apple', 'iPhone 16', 'Reparación cámara', 61400, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Apple', 'iPhone 16', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Apple', 'iPhone 16', 'Limpieza por líquido', 76300, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Apple', 'iPhone 16', 'Botones / flex', 39900, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Apple', 'iPhone 16', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Apple', 'iPhone 16', 'Reparación placa base', 134400, 'AR', 'mobile_board', 10),
    ('Smartphones', 'Apple', 'iPhone 16 Plus', 'Cambio de pantalla', 185500, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Apple', 'iPhone 16 Plus', 'Cambio de batería', 76400, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Apple', 'iPhone 16 Plus', 'Reparación puerto de carga', 49200, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Apple', 'iPhone 16 Plus', 'Micrófono / altavoz', 43200, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Apple', 'iPhone 16 Plus', 'Reparación cámara', 64300, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Apple', 'iPhone 16 Plus', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Apple', 'iPhone 16 Plus', 'Limpieza por líquido', 78100, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Apple', 'iPhone 16 Plus', 'Botones / flex', 40800, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Apple', 'iPhone 16 Plus', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Apple', 'iPhone 16 Plus', 'Reparación placa base', 138300, 'AR', 'mobile_board', 10),
    ('Smartphones', 'Apple', 'iPhone 16 Pro', 'Cambio de pantalla', 171500, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Apple', 'iPhone 16 Pro', 'Cambio de batería', 70800, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Apple', 'iPhone 16 Pro', 'Reparación puerto de carga', 47700, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Apple', 'iPhone 16 Pro', 'Micrófono / altavoz', 42000, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Apple', 'iPhone 16 Pro', 'Reparación cámara', 61400, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Apple', 'iPhone 16 Pro', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Apple', 'iPhone 16 Pro', 'Limpieza por líquido', 76300, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Apple', 'iPhone 16 Pro', 'Botones / flex', 39900, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Apple', 'iPhone 16 Pro', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Apple', 'iPhone 16 Pro', 'Reparación placa base', 134400, 'AR', 'mobile_board', 10),
    ('Smartphones', 'Apple', 'iPhone 16 Pro Max', 'Cambio de pantalla', 185500, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Apple', 'iPhone 16 Pro Max', 'Cambio de batería', 76400, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Apple', 'iPhone 16 Pro Max', 'Reparación puerto de carga', 49200, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Apple', 'iPhone 16 Pro Max', 'Micrófono / altavoz', 43200, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Apple', 'iPhone 16 Pro Max', 'Reparación cámara', 64300, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Apple', 'iPhone 16 Pro Max', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Apple', 'iPhone 16 Pro Max', 'Limpieza por líquido', 78100, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Apple', 'iPhone 16 Pro Max', 'Botones / flex', 40800, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Apple', 'iPhone 16 Pro Max', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Apple', 'iPhone 16 Pro Max', 'Reparación placa base', 138300, 'AR', 'mobile_board', 10);

    -- ============================================
    -- SMARTPHONES - Otras marcas (precios base sin multiplicadores)
    -- ============================================
    
    -- Samsung, Xiaomi, Huawei, Google, OnePlus, Motorola, OPPO, Vivo, Realme, etc.
    -- Todos usan precios base de los tiers sin multiplicador Apple
    
    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Smartphones', 'Samsung', '(Todos los modelos)', 'Cambio de pantalla', 128000, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Samsung', '(Todos los modelos)', 'Cambio de batería', 58000, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Samsung', '(Todos los modelos)', 'Reparación puerto de carga', 45000, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Samsung', '(Todos los modelos)', 'Micrófono / altavoz', 40000, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Samsung', '(Todos los modelos)', 'Reparación cámara', 52000, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Samsung', '(Todos los modelos)', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Samsung', '(Todos los modelos)', 'Limpieza por líquido', 72000, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Samsung', '(Todos los modelos)', 'Botones / flex', 38000, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Samsung', '(Todos los modelos)', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Samsung', '(Todos los modelos)', 'Reparación placa base', 105000, 'AR', 'mobile_board', 10);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Smartphones', 'Xiaomi', '(Todos los modelos)', 'Cambio de pantalla', 128000, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Xiaomi', '(Todos los modelos)', 'Cambio de batería', 58000, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Xiaomi', '(Todos los modelos)', 'Reparación puerto de carga', 45000, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Xiaomi', '(Todos los modelos)', 'Micrófono / altavoz', 40000, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Xiaomi', '(Todos los modelos)', 'Reparación cámara', 52000, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Xiaomi', '(Todos los modelos)', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Xiaomi', '(Todos los modelos)', 'Limpieza por líquido', 72000, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Xiaomi', '(Todos los modelos)', 'Botones / flex', 38000, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Xiaomi', '(Todos los modelos)', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Xiaomi', '(Todos los modelos)', 'Reparación placa base', 105000, 'AR', 'mobile_board', 10);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Smartphones', 'Huawei', '(Todos los modelos)', 'Cambio de pantalla', 128000, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Huawei', '(Todos los modelos)', 'Cambio de batería', 58000, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Huawei', '(Todos los modelos)', 'Reparación puerto de carga', 45000, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Huawei', '(Todos los modelos)', 'Micrófono / altavoz', 40000, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Huawei', '(Todos los modelos)', 'Reparación cámara', 52000, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Huawei', '(Todos los modelos)', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Huawei', '(Todos los modelos)', 'Limpieza por líquido', 72000, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Huawei', '(Todos los modelos)', 'Botones / flex', 38000, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Huawei', '(Todos los modelos)', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Huawei', '(Todos los modelos)', 'Reparación placa base', 105000, 'AR', 'mobile_board', 10);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Smartphones', 'Google', '(Todos los modelos)', 'Cambio de pantalla', 128000, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Google', '(Todos los modelos)', 'Cambio de batería', 58000, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Google', '(Todos los modelos)', 'Reparación puerto de carga', 45000, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Google', '(Todos los modelos)', 'Micrófono / altavoz', 40000, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Google', '(Todos los modelos)', 'Reparación cámara', 52000, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Google', '(Todos los modelos)', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Google', '(Todos los modelos)', 'Limpieza por líquido', 72000, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Google', '(Todos los modelos)', 'Botones / flex', 38000, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Google', '(Todos los modelos)', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Google', '(Todos los modelos)', 'Reparación placa base', 105000, 'AR', 'mobile_board', 10);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Smartphones', 'OnePlus', '(Todos los modelos)', 'Cambio de pantalla', 128000, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'OnePlus', '(Todos los modelos)', 'Cambio de batería', 58000, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'OnePlus', '(Todos los modelos)', 'Reparación puerto de carga', 45000, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'OnePlus', '(Todos los modelos)', 'Micrófono / altavoz', 40000, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'OnePlus', '(Todos los modelos)', 'Reparación cámara', 52000, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'OnePlus', '(Todos los modelos)', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'OnePlus', '(Todos los modelos)', 'Limpieza por líquido', 72000, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'OnePlus', '(Todos los modelos)', 'Botones / flex', 38000, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'OnePlus', '(Todos los modelos)', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'OnePlus', '(Todos los modelos)', 'Reparación placa base', 105000, 'AR', 'mobile_board', 10);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Smartphones', 'Motorola', '(Todos los modelos)', 'Cambio de pantalla', 128000, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Motorola', '(Todos los modelos)', 'Cambio de batería', 58000, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Motorola', '(Todos los modelos)', 'Reparación puerto de carga', 45000, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Motorola', '(Todos los modelos)', 'Micrófono / altavoz', 40000, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Motorola', '(Todos los modelos)', 'Reparación cámara', 52000, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Motorola', '(Todos los modelos)', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Motorola', '(Todos los modelos)', 'Limpieza por líquido', 72000, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Motorola', '(Todos los modelos)', 'Botones / flex', 38000, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Motorola', '(Todos los modelos)', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Motorola', '(Todos los modelos)', 'Reparación placa base', 105000, 'AR', 'mobile_board', 10);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Smartphones', 'OPPO', '(Todos los modelos)', 'Cambio de pantalla', 128000, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'OPPO', '(Todos los modelos)', 'Cambio de batería', 58000, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'OPPO', '(Todos los modelos)', 'Reparación puerto de carga', 45000, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'OPPO', '(Todos los modelos)', 'Micrófono / altavoz', 40000, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'OPPO', '(Todos los modelos)', 'Reparación cámara', 52000, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'OPPO', '(Todos los modelos)', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'OPPO', '(Todos los modelos)', 'Limpieza por líquido', 72000, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'OPPO', '(Todos los modelos)', 'Botones / flex', 38000, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'OPPO', '(Todos los modelos)', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'OPPO', '(Todos los modelos)', 'Reparación placa base', 105000, 'AR', 'mobile_board', 10);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Smartphones', 'Vivo', '(Todos los modelos)', 'Cambio de pantalla', 128000, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Vivo', '(Todos los modelos)', 'Cambio de batería', 58000, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Vivo', '(Todos los modelos)', 'Reparación puerto de carga', 45000, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Vivo', '(Todos los modelos)', 'Micrófono / altavoz', 40000, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Vivo', '(Todos los modelos)', 'Reparación cámara', 52000, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Vivo', '(Todos los modelos)', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Vivo', '(Todos los modelos)', 'Limpieza por líquido', 72000, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Vivo', '(Todos los modelos)', 'Botones / flex', 38000, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Vivo', '(Todos los modelos)', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Vivo', '(Todos los modelos)', 'Reparación placa base', 105000, 'AR', 'mobile_board', 10);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Smartphones', 'Sony', '(Todos los modelos)', 'Cambio de pantalla', 128000, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Sony', '(Todos los modelos)', 'Cambio de batería', 58000, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Sony', '(Todos los modelos)', 'Reparación puerto de carga', 45000, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Sony', '(Todos los modelos)', 'Micrófono / altavoz', 40000, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Sony', '(Todos los modelos)', 'Reparación cámara', 52000, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Sony', '(Todos los modelos)', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Sony', '(Todos los modelos)', 'Limpieza por líquido', 72000, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Sony', '(Todos los modelos)', 'Botones / flex', 38000, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Sony', '(Todos los modelos)', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Sony', '(Todos los modelos)', 'Reparación placa base', 105000, 'AR', 'mobile_board', 10);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Smartphones', 'Nokia', '(Todos los modelos)', 'Cambio de pantalla', 128000, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'Nokia', '(Todos los modelos)', 'Cambio de batería', 58000, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'Nokia', '(Todos los modelos)', 'Reparación puerto de carga', 45000, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'Nokia', '(Todos los modelos)', 'Micrófono / altavoz', 40000, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'Nokia', '(Todos los modelos)', 'Reparación cámara', 52000, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'Nokia', '(Todos los modelos)', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'Nokia', '(Todos los modelos)', 'Limpieza por líquido', 72000, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'Nokia', '(Todos los modelos)', 'Botones / flex', 38000, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'Nokia', '(Todos los modelos)', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'Nokia', '(Todos los modelos)', 'Reparación placa base', 105000, 'AR', 'mobile_board', 10);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Smartphones', 'LG', '(Todos los modelos)', 'Cambio de pantalla', 128000, 'AR', 'mobile_screen', 1),
    ('Smartphones', 'LG', '(Todos los modelos)', 'Cambio de batería', 58000, 'AR', 'mobile_battery', 2),
    ('Smartphones', 'LG', '(Todos los modelos)', 'Reparación puerto de carga', 45000, 'AR', 'mobile_charge_port', 3),
    ('Smartphones', 'LG', '(Todos los modelos)', 'Micrófono / altavoz', 40000, 'AR', 'mobile_mic_speaker', 4),
    ('Smartphones', 'LG', '(Todos los modelos)', 'Reparación cámara', 52000, 'AR', 'mobile_camera', 5),
    ('Smartphones', 'LG', '(Todos los modelos)', 'Software / desbloqueo', 20000, 'AR', 'mobile_software', 6),
    ('Smartphones', 'LG', '(Todos los modelos)', 'Limpieza por líquido', 72000, 'AR', 'mobile_liquid_clean', 7),
    ('Smartphones', 'LG', '(Todos los modelos)', 'Botones / flex', 38000, 'AR', 'mobile_button_flex', 8),
    ('Smartphones', 'LG', '(Todos los modelos)', 'Copia / recuperación de datos', 28000, 'AR', 'mobile_data_recovery', 9),
    ('Smartphones', 'LG', '(Todos los modelos)', 'Reparación placa base', 105000, 'AR', 'mobile_board', 10);

    -- ============================================
    -- TABLETS
    -- ============================================
    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Tablets', 'Apple', '(Todos los modelos)', 'Cambio de pantalla', 165000, 'AR', 'tablet_screen', 1),
    ('Tablets', 'Apple', '(Todos los modelos)', 'Cambio de batería', 78000, 'AR', 'tablet_battery', 2),
    ('Tablets', 'Apple', '(Todos los modelos)', 'Puerto de carga', 52000, 'AR', 'tablet_charge_port', 3),
    ('Tablets', 'Apple', '(Todos los modelos)', 'Cámara', 62000, 'AR', 'tablet_camera', 4),
    ('Tablets', 'Apple', '(Todos los modelos)', 'Software / actualización', 22000, 'AR', 'tablet_software', 5),
    ('Tablets', 'Apple', '(Todos los modelos)', 'Limpieza por líquido', 82000, 'AR', 'tablet_liquid_clean', 6),
    ('Tablets', 'Apple', '(Todos los modelos)', 'Placa / no enciende', 118000, 'AR', 'tablet_board', 7);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Tablets', 'Samsung', '(Todos los modelos)', 'Cambio de pantalla', 165000, 'AR', 'tablet_screen', 1),
    ('Tablets', 'Samsung', '(Todos los modelos)', 'Cambio de batería', 78000, 'AR', 'tablet_battery', 2),
    ('Tablets', 'Samsung', '(Todos los modelos)', 'Puerto de carga', 52000, 'AR', 'tablet_charge_port', 3),
    ('Tablets', 'Samsung', '(Todos los modelos)', 'Cámara', 62000, 'AR', 'tablet_camera', 4),
    ('Tablets', 'Samsung', '(Todos los modelos)', 'Software / actualización', 22000, 'AR', 'tablet_software', 5),
    ('Tablets', 'Samsung', '(Todos los modelos)', 'Limpieza por líquido', 82000, 'AR', 'tablet_liquid_clean', 6),
    ('Tablets', 'Samsung', '(Todos los modelos)', 'Placa / no enciende', 118000, 'AR', 'tablet_board', 7);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Tablets', 'Xiaomi', '(Todos los modelos)', 'Cambio de pantalla', 165000, 'AR', 'tablet_screen', 1),
    ('Tablets', 'Xiaomi', '(Todos los modelos)', 'Cambio de batería', 78000, 'AR', 'tablet_battery', 2),
    ('Tablets', 'Xiaomi', '(Todos los modelos)', 'Puerto de carga', 52000, 'AR', 'tablet_charge_port', 3),
    ('Tablets', 'Xiaomi', '(Todos los modelos)', 'Cámara', 62000, 'AR', 'tablet_camera', 4),
    ('Tablets', 'Xiaomi', '(Todos los modelos)', 'Software / actualización', 22000, 'AR', 'tablet_software', 5),
    ('Tablets', 'Xiaomi', '(Todos los modelos)', 'Limpieza por líquido', 82000, 'AR', 'tablet_liquid_clean', 6),
    ('Tablets', 'Xiaomi', '(Todos los modelos)', 'Placa / no enciende', 118000, 'AR', 'tablet_board', 7);

    -- ============================================
    -- LAPTOPS Y PC
    -- ============================================
    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Laptops y PC', 'Apple', '(Todos los modelos)', 'Cambio de pantalla', 245000, 'AR', 'laptop_screen', 1),
    ('Laptops y PC', 'Apple', '(Todos los modelos)', 'Batería interna', 95000, 'AR', 'laptop_battery', 2),
    ('Laptops y PC', 'Apple', '(Todos los modelos)', 'Teclado', 78000, 'AR', 'laptop_keyboard', 3),
    ('Laptops y PC', 'Apple', '(Todos los modelos)', 'Trackpad / touchpad', 65000, 'AR', 'laptop_trackpad', 4),
    ('Laptops y PC', 'Apple', '(Todos los modelos)', 'Carga / jack CC', 72000, 'AR', 'laptop_charging', 5),
    ('Laptops y PC', 'Apple', '(Todos los modelos)', 'Upgrade SSD / RAM', 48000, 'AR', 'laptop_ssd_ram', 6),
    ('Laptops y PC', 'Apple', '(Todos los modelos)', 'Mantenimiento térmico / ventilador', 55000, 'AR', 'laptop_thermal', 7),
    ('Laptops y PC', 'Apple', '(Todos los modelos)', 'Bisagras / carcasa', 88000, 'AR', 'laptop_hinge', 8),
    ('Laptops y PC', 'Apple', '(Todos los modelos)', 'Placa base / encendido', 165000, 'AR', 'laptop_board', 9);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Laptops y PC', 'Dell', '(Todos los modelos)', 'Cambio de pantalla', 245000, 'AR', 'laptop_screen', 1),
    ('Laptops y PC', 'Dell', '(Todos los modelos)', 'Batería interna', 95000, 'AR', 'laptop_battery', 2),
    ('Laptops y PC', 'Dell', '(Todos los modelos)', 'Teclado', 78000, 'AR', 'laptop_keyboard', 3),
    ('Laptops y PC', 'Dell', '(Todos los modelos)', 'Trackpad / touchpad', 65000, 'AR', 'laptop_trackpad', 4),
    ('Laptops y PC', 'Dell', '(Todos los modelos)', 'Carga / jack CC', 72000, 'AR', 'laptop_charging', 5),
    ('Laptops y PC', 'Dell', '(Todos los modelos)', 'Upgrade SSD / RAM', 48000, 'AR', 'laptop_ssd_ram', 6),
    ('Laptops y PC', 'Dell', '(Todos los modelos)', 'Mantenimiento térmico / ventilador', 55000, 'AR', 'laptop_thermal', 7),
    ('Laptops y PC', 'Dell', '(Todos los modelos)', 'Bisagras / carcasa', 88000, 'AR', 'laptop_hinge', 8),
    ('Laptops y PC', 'Dell', '(Todos los modelos)', 'Placa base / encendido', 165000, 'AR', 'laptop_board', 9);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Laptops y PC', 'HP', '(Todos los modelos)', 'Cambio de pantalla', 245000, 'AR', 'laptop_screen', 1),
    ('Laptops y PC', 'HP', '(Todos los modelos)', 'Batería interna', 95000, 'AR', 'laptop_battery', 2),
    ('Laptops y PC', 'HP', '(Todos los modelos)', 'Teclado', 78000, 'AR', 'laptop_keyboard', 3),
    ('Laptops y PC', 'HP', '(Todos los modelos)', 'Trackpad / touchpad', 65000, 'AR', 'laptop_trackpad', 4),
    ('Laptops y PC', 'HP', '(Todos los modelos)', 'Carga / jack CC', 72000, 'AR', 'laptop_charging', 5),
    ('Laptops y PC', 'HP', '(Todos los modelos)', 'Upgrade SSD / RAM', 48000, 'AR', 'laptop_ssd_ram', 6),
    ('Laptops y PC', 'HP', '(Todos los modelos)', 'Mantenimiento térmico / ventilador', 55000, 'AR', 'laptop_thermal', 7),
    ('Laptops y PC', 'HP', '(Todos los modelos)', 'Bisagras / carcasa', 88000, 'AR', 'laptop_hinge', 8),
    ('Laptops y PC', 'HP', '(Todos los modelos)', 'Placa base / encendido', 165000, 'AR', 'laptop_board', 9);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Laptops y PC', 'Lenovo', '(Todos los modelos)', 'Cambio de pantalla', 245000, 'AR', 'laptop_screen', 1),
    ('Laptops y PC', 'Lenovo', '(Todos los modelos)', 'Batería interna', 95000, 'AR', 'laptop_battery', 2),
    ('Laptops y PC', 'Lenovo', '(Todos los modelos)', 'Teclado', 78000, 'AR', 'laptop_keyboard', 3),
    ('Laptops y PC', 'Lenovo', '(Todos los modelos)', 'Trackpad / touchpad', 65000, 'AR', 'laptop_trackpad', 4),
    ('Laptops y PC', 'Lenovo', '(Todos los modelos)', 'Carga / jack CC', 72000, 'AR', 'laptop_charging', 5),
    ('Laptops y PC', 'Lenovo', '(Todos los modelos)', 'Upgrade SSD / RAM', 48000, 'AR', 'laptop_ssd_ram', 6),
    ('Laptops y PC', 'Lenovo', '(Todos los modelos)', 'Mantenimiento térmico / ventilador', 55000, 'AR', 'laptop_thermal', 7),
    ('Laptops y PC', 'Lenovo', '(Todos los modelos)', 'Bisagras / carcasa', 88000, 'AR', 'laptop_hinge', 8),
    ('Laptops y PC', 'Lenovo', '(Todos los modelos)', 'Placa base / encendido', 165000, 'AR', 'laptop_board', 9);

    -- ============================================
    -- CONSOLAS
    -- ============================================
    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Consolas', 'Sony', '(Todos los modelos)', 'HDMI / salida vídeo', 38000, 'AR', 'console_hdmi', 1),
    ('Consolas', 'Sony', '(Todos los modelos)', 'Mandos / drift / sticks', 32000, 'AR', 'console_controller', 2),
    ('Consolas', 'Sony', '(Todos los modelos)', 'Limpieza y ventilador', 25000, 'AR', 'console_fan_clean', 3),
    ('Consolas', 'Sony', '(Todos los modelos)', 'Lector / láser (físico)', 48000, 'AR', 'console_disc_laser', 4),
    ('Consolas', 'Sony', '(Todos los modelos)', 'Software / actualización', 22000, 'AR', 'console_software', 5);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Consolas', 'Microsoft', '(Todos los modelos)', 'HDMI / salida vídeo', 38000, 'AR', 'console_hdmi', 1),
    ('Consolas', 'Microsoft', '(Todos los modelos)', 'Mandos / drift / sticks', 32000, 'AR', 'console_controller', 2),
    ('Consolas', 'Microsoft', '(Todos los modelos)', 'Limpieza y ventilador', 25000, 'AR', 'console_fan_clean', 3),
    ('Consolas', 'Microsoft', '(Todos los modelos)', 'Lector / láser (físico)', 48000, 'AR', 'console_disc_laser', 4),
    ('Consolas', 'Microsoft', '(Todos los modelos)', 'Software / actualización', 22000, 'AR', 'console_software', 5);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Consolas', 'Nintendo', '(Todos los modelos)', 'HDMI / salida vídeo', 38000, 'AR', 'console_hdmi', 1),
    ('Consolas', 'Nintendo', '(Todos los modelos)', 'Mandos / drift / sticks', 32000, 'AR', 'console_controller', 2),
    ('Consolas', 'Nintendo', '(Todos los modelos)', 'Limpieza y ventilador', 25000, 'AR', 'console_fan_clean', 3),
    ('Consolas', 'Nintendo', '(Todos los modelos)', 'Lector / láser (físico)', 48000, 'AR', 'console_disc_laser', 4),
    ('Consolas', 'Nintendo', '(Todos los modelos)', 'Software / actualización', 22000, 'AR', 'console_software', 5);

    -- ============================================
    -- SMARTWATCH
    -- ============================================
    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Smartwatch', 'Apple', '(Todos los modelos)', 'Pantalla / cristal', 105000, 'AR', 'watch_screen', 1),
    ('Smartwatch', 'Apple', '(Todos los modelos)', 'Batería', 62000, 'AR', 'watch_battery', 2),
    ('Smartwatch', 'Apple', '(Todos los modelos)', 'Sensores / carga', 72000, 'AR', 'watch_sensor', 3);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Smartwatch', 'Samsung', '(Todos los modelos)', 'Pantalla / cristal', 105000, 'AR', 'watch_screen', 1),
    ('Smartwatch', 'Samsung', '(Todos los modelos)', 'Batería', 62000, 'AR', 'watch_battery', 2),
    ('Smartwatch', 'Samsung', '(Todos los modelos)', 'Sensores / carga', 72000, 'AR', 'watch_sensor', 3);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Smartwatch', 'Google', '(Todos los modelos)', 'Pantalla / cristal', 105000, 'AR', 'watch_screen', 1),
    ('Smartwatch', 'Google', '(Todos los modelos)', 'Batería', 62000, 'AR', 'watch_battery', 2),
    ('Smartwatch', 'Google', '(Todos los modelos)', 'Sensores / carga', 72000, 'AR', 'watch_sensor', 3);

    -- ============================================
    -- AURICULARES
    -- ============================================
    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Auriculares', 'Apple', '(Todos los modelos)', 'Batería (TWS)', 35000, 'AR', 'earphone_battery', 1),
    ('Auriculares', 'Apple', '(Todos los modelos)', 'Driver / audio unilateral', 42000, 'AR', 'earphone_driver', 2),
    ('Auriculares', 'Apple', '(Todos los modelos)', 'Estuche / pin carga', 38000, 'AR', 'earphone_case_charge', 3);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Auriculares', 'Samsung', '(Todos los modelos)', 'Batería (TWS)', 35000, 'AR', 'earphone_battery', 1),
    ('Auriculares', 'Samsung', '(Todos los modelos)', 'Driver / audio unilateral', 42000, 'AR', 'earphone_driver', 2),
    ('Auriculares', 'Samsung', '(Todos los modelos)', 'Estuche / pin carga', 38000, 'AR', 'earphone_case_charge', 3);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Auriculares', 'Sony', '(Todos los modelos)', 'Batería (TWS)', 35000, 'AR', 'earphone_battery', 1),
    ('Auriculares', 'Sony', '(Todos los modelos)', 'Driver / audio unilateral', 42000, 'AR', 'earphone_driver', 2),
    ('Auriculares', 'Sony', '(Todos los modelos)', 'Estuche / pin carga', 38000, 'AR', 'earphone_case_charge', 3);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Auriculares', 'Bose', '(Todos los modelos)', 'Batería (TWS)', 35000, 'AR', 'earphone_battery', 1),
    ('Auriculares', 'Bose', '(Todos los modelos)', 'Driver / audio unilateral', 42000, 'AR', 'earphone_driver', 2),
    ('Auriculares', 'Bose', '(Todos los modelos)', 'Estuche / pin carga', 38000, 'AR', 'earphone_case_charge', 3);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Auriculares', 'JBL', '(Todos los modelos)', 'Batería (TWS)', 35000, 'AR', 'earphone_battery', 1),
    ('Auriculares', 'JBL', '(Todos los modelos)', 'Driver / audio unilateral', 42000, 'AR', 'earphone_driver', 2),
    ('Auriculares', 'JBL', '(Todos los modelos)', 'Estuche / pin carga', 38000, 'AR', 'earphone_case_charge', 3);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Auriculares', 'Sennheiser', '(Todos los modelos)', 'Batería (TWS)', 35000, 'AR', 'earphone_battery', 1),
    ('Auriculares', 'Sennheiser', '(Todos los modelos)', 'Driver / audio unilateral', 42000, 'AR', 'earphone_driver', 2),
    ('Auriculares', 'Sennheiser', '(Todos los modelos)', 'Estuche / pin carga', 38000, 'AR', 'earphone_case_charge', 3);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Auriculares', 'Anker', '(Todos los modelos)', 'Batería (TWS)', 35000, 'AR', 'earphone_battery', 1),
    ('Auriculares', 'Anker', '(Todos los modelos)', 'Driver / audio unilateral', 42000, 'AR', 'earphone_driver', 2),
    ('Auriculares', 'Anker', '(Todos los modelos)', 'Estuche / pin carga', 38000, 'AR', 'earphone_case_charge', 3);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Auriculares', 'AudioTechnica', '(Todos los modelos)', 'Batería (TWS)', 35000, 'AR', 'earphone_battery', 1),
    ('Auriculares', 'AudioTechnica', '(Todos los modelos)', 'Driver / audio unilateral', 42000, 'AR', 'earphone_driver', 2),
    ('Auriculares', 'AudioTechnica', '(Todos los modelos)', 'Estuche / pin carga', 38000, 'AR', 'earphone_case_charge', 3);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Auriculares', 'Beats', '(Todos los modelos)', 'Batería (TWS)', 35000, 'AR', 'earphone_battery', 1),
    ('Auriculares', 'Beats', '(Todos los modelos)', 'Driver / audio unilateral', 42000, 'AR', 'earphone_driver', 2),
    ('Auriculares', 'Beats', '(Todos los modelos)', 'Estuche / pin carga', 38000, 'AR', 'earphone_case_charge', 3);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Auriculares', 'Google', '(Todos los modelos)', 'Batería (TWS)', 35000, 'AR', 'earphone_battery', 1),
    ('Auriculares', 'Google', '(Todos los modelos)', 'Driver / audio unilateral', 42000, 'AR', 'earphone_driver', 2),
    ('Auriculares', 'Google', '(Todos los modelos)', 'Estuche / pin carga', 38000, 'AR', 'earphone_case_charge', 3);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Auriculares', 'Nothing', '(Todos los modelos)', 'Batería (TWS)', 35000, 'AR', 'earphone_battery', 1),
    ('Auriculares', 'Nothing', '(Todos los modelos)', 'Driver / audio unilateral', 42000, 'AR', 'earphone_driver', 2),
    ('Auriculares', 'Nothing', '(Todos los modelos)', 'Estuche / pin carga', 38000, 'AR', 'earphone_case_charge', 3);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Auriculares', 'Xiaomi', '(Todos los modelos)', 'Batería (TWS)', 35000, 'AR', 'earphone_battery', 1),
    ('Auriculares', 'Xiaomi', '(Todos los modelos)', 'Driver / audio unilateral', 42000, 'AR', 'earphone_driver', 2),
    ('Auriculares', 'Xiaomi', '(Todos los modelos)', 'Estuche / pin carga', 38000, 'AR', 'earphone_case_charge', 3);

    -- ============================================
    -- SMART TV
    -- ============================================
    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Smart TV', 'Samsung', '(Todos los modelos)', 'Panel / imagen', 320000, 'AR', 'tv_panel', 1),
    ('Smart TV', 'Samsung', '(Todos los modelos)', 'Retroiluminación LED', 135000, 'AR', 'tv_backlight', 2),
    ('Smart TV', 'Samsung', '(Todos los modelos)', 'Placa principal', 105000, 'AR', 'tv_board', 3),
    ('Smart TV', 'Samsung', '(Todos los modelos)', 'Fuente de alimentación', 72000, 'AR', 'tv_power', 4),
    ('Smart TV', 'Samsung', '(Todos los modelos)', 'Puertos HDMI', 48000, 'AR', 'tv_hdmi_ports', 5),
    ('Smart TV', 'Samsung', '(Todos los modelos)', 'Software / Smart TV', 28000, 'AR', 'tv_software', 6);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Smart TV', 'LG', '(Todos los modelos)', 'Panel / imagen', 320000, 'AR', 'tv_panel', 1),
    ('Smart TV', 'LG', '(Todos los modelos)', 'Retroiluminación LED', 135000, 'AR', 'tv_backlight', 2),
    ('Smart TV', 'LG', '(Todos los modelos)', 'Placa principal', 105000, 'AR', 'tv_board', 3),
    ('Smart TV', 'LG', '(Todos los modelos)', 'Fuente de alimentación', 72000, 'AR', 'tv_power', 4),
    ('Smart TV', 'LG', '(Todos los modelos)', 'Puertos HDMI', 48000, 'AR', 'tv_hdmi_ports', 5),
    ('Smart TV', 'LG', '(Todos los modelos)', 'Software / Smart TV', 28000, 'AR', 'tv_software', 6);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Smart TV', 'Sony', '(Todos los modelos)', 'Panel / imagen', 320000, 'AR', 'tv_panel', 1),
    ('Smart TV', 'Sony', '(Todos los modelos)', 'Retroiluminación LED', 135000, 'AR', 'tv_backlight', 2),
    ('Smart TV', 'Sony', '(Todos los modelos)', 'Placa principal', 105000, 'AR', 'tv_board', 3),
    ('Smart TV', 'Sony', '(Todos los modelos)', 'Fuente de alimentación', 72000, 'AR', 'tv_power', 4),
    ('Smart TV', 'Sony', '(Todos los modelos)', 'Puertos HDMI', 48000, 'AR', 'tv_hdmi_ports', 5),
    ('Smart TV', 'Sony', '(Todos los modelos)', 'Software / Smart TV', 28000, 'AR', 'tv_software', 6);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Smart TV', 'TCL', '(Todos los modelos)', 'Panel / imagen', 320000, 'AR', 'tv_panel', 1),
    ('Smart TV', 'TCL', '(Todos los modelos)', 'Retroiluminación LED', 135000, 'AR', 'tv_backlight', 2),
    ('Smart TV', 'TCL', '(Todos los modelos)', 'Placa principal', 105000, 'AR', 'tv_board', 3),
    ('Smart TV', 'TCL', '(Todos los modelos)', 'Fuente de alimentación', 72000, 'AR', 'tv_power', 4),
    ('Smart TV', 'TCL', '(Todos los modelos)', 'Puertos HDMI', 48000, 'AR', 'tv_hdmi_ports', 5),
    ('Smart TV', 'TCL', '(Todos los modelos)', 'Software / Smart TV', 28000, 'AR', 'tv_software', 6);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Smart TV', 'Hisense', '(Todos los modelos)', 'Panel / imagen', 320000, 'AR', 'tv_panel', 1),
    ('Smart TV', 'Hisense', '(Todos los modelos)', 'Retroiluminación LED', 135000, 'AR', 'tv_backlight', 2),
    ('Smart TV', 'Hisense', '(Todos los modelos)', 'Placa principal', 105000, 'AR', 'tv_board', 3),
    ('Smart TV', 'Hisense', '(Todos los modelos)', 'Fuente de alimentación', 72000, 'AR', 'tv_power', 4),
    ('Smart TV', 'Hisense', '(Todos los modelos)', 'Puertos HDMI', 48000, 'AR', 'tv_hdmi_ports', 5),
    ('Smart TV', 'Hisense', '(Todos los modelos)', 'Software / Smart TV', 28000, 'AR', 'tv_software', 6);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Smart TV', 'Philips', '(Todos los modelos)', 'Panel / imagen', 320000, 'AR', 'tv_panel', 1),
    ('Smart TV', 'Philips', '(Todos los modelos)', 'Retroiluminación LED', 135000, 'AR', 'tv_backlight', 2),
    ('Smart TV', 'Philips', '(Todos los modelos)', 'Placa principal', 105000, 'AR', 'tv_board', 3),
    ('Smart TV', 'Philips', '(Todos los modelos)', 'Fuente de alimentación', 72000, 'AR', 'tv_power', 4),
    ('Smart TV', 'Philips', '(Todos los modelos)', 'Puertos HDMI', 48000, 'AR', 'tv_hdmi_ports', 5),
    ('Smart TV', 'Philips', '(Todos los modelos)', 'Software / Smart TV', 28000, 'AR', 'tv_software', 6);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Smart TV', 'Panasonic', '(Todos los modelos)', 'Panel / imagen', 320000, 'AR', 'tv_panel', 1),
    ('Smart TV', 'Panasonic', '(Todos los modelos)', 'Retroiluminación LED', 135000, 'AR', 'tv_backlight', 2),
    ('Smart TV', 'Panasonic', '(Todos los modelos)', 'Placa principal', 105000, 'AR', 'tv_board', 3),
    ('Smart TV', 'Panasonic', '(Todos los modelos)', 'Fuente de alimentación', 72000, 'AR', 'tv_power', 4),
    ('Smart TV', 'Panasonic', '(Todos los modelos)', 'Puertos HDMI', 48000, 'AR', 'tv_hdmi_ports', 5),
    ('Smart TV', 'Panasonic', '(Todos los modelos)', 'Software / Smart TV', 28000, 'AR', 'tv_software', 6);

    -- ============================================
    -- EQUIPOS DE AUDIO Y VIDEO
    -- ============================================
    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Equipos de audio y vídeo', 'Sony', '(Todos los modelos)', 'Amplificador / AVR', 92000, 'AR', 'av_amp_service', 1),
    ('Equipos de audio y vídeo', 'Sony', '(Todos los modelos)', 'Altavoces / reparación cono', 62000, 'AR', 'av_speaker', 2),
    ('Equipos de audio y vídeo', 'Sony', '(Todos los modelos)', 'Conectores / soldadura', 45000, 'AR', 'av_connector', 3),
    ('Equipos de audio y vídeo', 'Sony', '(Todos los modelos)', 'Firmware / configuración', 22000, 'AR', 'av_software_update', 4);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Equipos de audio y vídeo', 'Yamaha', '(Todos los modelos)', 'Amplificador / AVR', 92000, 'AR', 'av_amp_service', 1),
    ('Equipos de audio y vídeo', 'Yamaha', '(Todos los modelos)', 'Altavoces / reparación cono', 62000, 'AR', 'av_speaker', 2),
    ('Equipos de audio y vídeo', 'Yamaha', '(Todos los modelos)', 'Conectores / soldadura', 45000, 'AR', 'av_connector', 3),
    ('Equipos de audio y vídeo', 'Yamaha', '(Todos los modelos)', 'Firmware / configuración', 22000, 'AR', 'av_software_update', 4);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Equipos de audio y vídeo', 'Denon', '(Todos los modelos)', 'Amplificador / AVR', 92000, 'AR', 'av_amp_service', 1),
    ('Equipos de audio y vídeo', 'Denon', '(Todos los modelos)', 'Altavoces / reparación cono', 62000, 'AR', 'av_speaker', 2),
    ('Equipos de audio y vídeo', 'Denon', '(Todos los modelos)', 'Conectores / soldadura', 45000, 'AR', 'av_connector', 3),
    ('Equipos de audio y vídeo', 'Denon', '(Todos los modelos)', 'Firmware / configuración', 22000, 'AR', 'av_software_update', 4);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Equipos de audio y vídeo', 'Pioneer', '(Todos los modelos)', 'Amplificador / AVR', 92000, 'AR', 'av_amp_service', 1),
    ('Equipos de audio y vídeo', 'Pioneer', '(Todos los modelos)', 'Altavoces / reparación cono', 62000, 'AR', 'av_speaker', 2),
    ('Equipos de audio y vídeo', 'Pioneer', '(Todos los modelos)', 'Conectores / soldadura', 45000, 'AR', 'av_connector', 3),
    ('Equipos de audio y vídeo', 'Pioneer', '(Todos los modelos)', 'Firmware / configuración', 22000, 'AR', 'av_software_update', 4);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Equipos de audio y vídeo', 'Bose', '(Todos los modelos)', 'Amplificador / AVR', 92000, 'AR', 'av_amp_service', 1),
    ('Equipos de audio y vídeo', 'Bose', '(Todos los modelos)', 'Altavoces / reparación cono', 62000, 'AR', 'av_speaker', 2),
    ('Equipos de audio y vídeo', 'Bose', '(Todos los modelos)', 'Conectores / soldadura', 45000, 'AR', 'av_connector', 3),
    ('Equipos de audio y vídeo', 'Bose', '(Todos los modelos)', 'Firmware / configuración', 22000, 'AR', 'av_software_update', 4);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Equipos de audio y vídeo', 'JBL', '(Todos los modelos)', 'Amplificador / AVR', 92000, 'AR', 'av_amp_service', 1),
    ('Equipos de audio y vídeo', 'JBL', '(Todos los modelos)', 'Altavoces / reparación cono', 62000, 'AR', 'av_speaker', 2),
    ('Equipos de audio y vídeo', 'JBL', '(Todos los modelos)', 'Conectores / soldadura', 45000, 'AR', 'av_connector', 3),
    ('Equipos de audio y vídeo', 'JBL', '(Todos los modelos)', 'Firmware / configuración', 22000, 'AR', 'av_software_update', 4);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Equipos de audio y vídeo', 'LG', '(Todos los modelos)', 'Amplificador / AVR', 92000, 'AR', 'av_amp_service', 1),
    ('Equipos de audio y vídeo', 'LG', '(Todos los modelos)', 'Altavoces / reparación cono', 62000, 'AR', 'av_speaker', 2),
    ('Equipos de audio y vídeo', 'LG', '(Todos los modelos)', 'Conectores / soldadura', 45000, 'AR', 'av_connector', 3),
    ('Equipos de audio y vídeo', 'LG', '(Todos los modelos)', 'Firmware / configuración', 22000, 'AR', 'av_software_update', 4);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Equipos de audio y vídeo', 'Samsung', '(Todos los modelos)', 'Amplificador / AVR', 92000, 'AR', 'av_amp_service', 1),
    ('Equipos de audio y vídeo', 'Samsung', '(Todos los modelos)', 'Altavoces / reparación cono', 62000, 'AR', 'av_speaker', 2),
    ('Equipos de audio y vídeo', 'Samsung', '(Todos los modelos)', 'Conectores / soldadura', 45000, 'AR', 'av_connector', 3),
    ('Equipos de audio y vídeo', 'Samsung', '(Todos los modelos)', 'Firmware / configuración', 22000, 'AR', 'av_software_update', 4);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Equipos de audio y vídeo', 'Marshall', '(Todos los modelos)', 'Amplificador / AVR', 92000, 'AR', 'av_amp_service', 1),
    ('Equipos de audio y vídeo', 'Marshall', '(Todos los modelos)', 'Altavoces / reparación cono', 62000, 'AR', 'av_speaker', 2),
    ('Equipos de audio y vídeo', 'Marshall', '(Todos los modelos)', 'Conectores / soldadura', 45000, 'AR', 'av_connector', 3),
    ('Equipos de audio y vídeo', 'Marshall', '(Todos los modelos)', 'Firmware / configuración', 22000, 'AR', 'av_software_update', 4);

    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Equipos de audio y vídeo', 'Sonos', '(Todos los modelos)', 'Amplificador / AVR', 92000, 'AR', 'av_amp_service', 1),
    ('Equipos de audio y vídeo', 'Sonos', '(Todos los modelos)', 'Altavoces / reparación cono', 62000, 'AR', 'av_speaker', 2),
    ('Equipos de audio y vídeo', 'Sonos', '(Todos los modelos)', 'Conectores / soldadura', 45000, 'AR', 'av_connector', 3),
    ('Equipos de audio y vídeo', 'Sonos', '(Todos los modelos)', 'Firmware / configuración', 22000, 'AR', 'av_software_update', 4);

    -- ============================================
    -- OTROS
    -- ============================================
    INSERT INTO public.service_catalog_master (category, brand, model, service_name, price, country_code, repair_type_code, display_order) VALUES
    ('Otros', 'Genérico', '(Todos los modelos)', 'Diagnóstico', 16000, 'AR', 'other_diagnosis', 1),
    ('Otros', 'Genérico', '(Todos los modelos)', 'Reparación general', 38000, 'AR', 'other_general', 2);

END $$;

-- ============================================
-- 3. FUNCIÓN PARA COPIAR CATÁLOGO A ORGANIZACIÓN
-- ============================================

CREATE OR REPLACE FUNCTION public.seed_organization_services(
    p_organization_id UUID,
    p_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_inserted_count INTEGER := 0;
BEGIN
    -- Copiar todos los servicios del catálogo maestro activo a la organización
    INSERT INTO public.repair_labor_services (
        user_id,
        organization_id,
        category,
        brand,
        model,
        service_name,
        price,
        show_in_widget,
        country_code,
        repair_type_code,
        pricing_year,
        source
    )
    SELECT 
        p_user_id,
        p_organization_id,
        scm.category,
        scm.brand,
        scm.model,
        scm.service_name,
        scm.price,
        scm.show_in_widget,
        scm.country_code,
        scm.repair_type_code,
        scm.pricing_year,
        'catalog_seed'::TEXT
    FROM public.service_catalog_master scm
    WHERE scm.is_active = TRUE
      AND scm.country_code = 'AR'
      AND NOT EXISTS (
          SELECT 1 FROM public.repair_labor_services rls
          WHERE rls.organization_id = p_organization_id
            AND rls.source = 'catalog_seed'
            AND rls.category = scm.category
            AND rls.brand = scm.brand
            AND rls.model = scm.model
            AND rls.service_name = scm.service_name
            AND rls.country_code = scm.country_code
      );

    GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

    RETURN v_inserted_count;
END;
$$;

COMMENT ON FUNCTION public.seed_organization_services(UUID, UUID) IS 
    'Copia el catálogo maestro de servicios a una organización específica. Se ejecuta automáticamente al crear una nueva organización.';

-- ============================================
-- 4. PERMISOS RLS PARA LA TABLA MAESTRA
-- ============================================

ALTER TABLE public.service_catalog_master ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si las hay (para permitir re-ejecución)
DROP POLICY IF EXISTS "service_catalog_master_select" ON public.service_catalog_master;
DROP POLICY IF EXISTS "service_catalog_master_admin" ON public.service_catalog_master;

-- Solo lectura para todos los usuarios autenticados (nadie puede modificar el catálogo maestro)
CREATE POLICY "service_catalog_master_select"
    ON public.service_catalog_master FOR SELECT TO authenticated
    USING (is_active = TRUE);

-- Solo super admins pueden modificar el catálogo maestro
CREATE POLICY "service_catalog_master_admin"
    ON public.service_catalog_master FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

COMMENT ON TABLE public.service_catalog_master IS 
    'Catálogo maestro de servicios de reparación. Contiene todos los servicios por defecto que se copian a nuevas organizaciones. Cada organización tiene su propia copia independiente en repair_labor_services.';

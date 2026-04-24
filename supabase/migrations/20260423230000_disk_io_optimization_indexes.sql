-- ============================================
-- OPTIMIZACIÓN DE DISK I/O - ÍNDICES CRÍTICOS
-- Fecha: 23 Abr 2026
-- Objetivo: Reducir lecturas de disco en Supabase
-- ============================================

-- 1. ÍNDICES PARA mari_aprendizajes (tabla de aprendizajes dinámicos)
-- Búsquedas frecuentes: organization_id + learning_type + status, normalized_topic

CREATE INDEX IF NOT EXISTS idx_mari_aprendizajes_org_type_status
    ON public.mari_aprendizajes (organization_id, learning_type, status);

CREATE INDEX IF NOT EXISTS idx_mari_aprendizajes_topic
    ON public.mari_aprendizajes (organization_id, normalized_topic);

CREATE INDEX IF NOT EXISTS idx_mari_aprendizajes_pending
    ON public.mari_aprendizajes (organization_id, learning_type, status, times_seen DESC)
    WHERE learning_type = 'missing_info_alert' AND status = 'pending_review';

-- 2. ÍNDICES PARA TABLAS DE HISTORIAL/MENSAJES

-- Para mari_conversations (búsquedas por organización y teléfono)
CREATE INDEX IF NOT EXISTS idx_mari_conversations_org_phone
    ON public.mari_conversations (organization_id, customer_phone);

CREATE INDEX IF NOT EXISTS idx_mari_conversations_org_status
    ON public.mari_conversations (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_mari_conversations_updated
    ON public.mari_conversations (organization_id, updated_at DESC);

-- Para mari_messages (búsquedas por conversación y fecha)
CREATE INDEX IF NOT EXISTS idx_mari_messages_conv_created
    ON public.mari_messages (conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mari_messages_sender
    ON public.mari_messages (conversation_id, sender_type, created_at DESC);

-- 3. ÍNDICES PARA CORRECCIONES (búsqueda rápida de correcciones activas)
CREATE INDEX IF NOT EXISTS idx_mari_corrections_org_active
    ON public.mari_corrections (organization_id, is_active);

-- 4. ÍNDICES PARA KNOWLEDGE BASE (búsquedas por categoría)
CREATE INDEX IF NOT EXISTS idx_mari_knowledge_org_category
    ON public.mari_knowledge (organization_id, category, is_active);

-- 5. ÍNDICES PARA SESIONES WHATSAPP
CREATE INDEX IF NOT EXISTS idx_mari_sessions_org_status
    ON public.mari_whatsapp_sessions (organization_id, status);

-- 6. TABLA DE SERVICIOS (cacheada frecuentemente)
-- Asegurar índices existentes para búsquedas por estado
CREATE INDEX IF NOT EXISTS idx_services_active_name
    ON public.services (is_active, name);

-- ============================================
-- OPTIMIZACIÓN: Limpieza de tablas de log innecesarias
-- ============================================

-- Función para limpiar mensajes antiguos automáticamente
-- (mantener solo últimos 90 días de mensajes detallados)
CREATE OR REPLACE FUNCTION public.cleanup_old_mari_messages()
RETURNS void AS $$
BEGIN
    DELETE FROM public.mari_messages
    WHERE created_at < NOW() - INTERVAL '90 days'
    AND sender_type = 'mari'; -- Solo logs de Mari, preservar conversaciones cliente
    
    -- Limpiar aprendizajes resueltos muy antiguos
    DELETE FROM public.mari_aprendizajes
    WHERE status = 'resolved'
    AND last_seen_at < NOW() - INTERVAL '180 days';
END;
$$ LANGUAGE plpgsql;

-- Programar limpieza automática diaria (opcional, requiere pg_cron)
-- SELECT cron.schedule('0 3 * * *', 'SELECT public.cleanup_old_mari_messages()');

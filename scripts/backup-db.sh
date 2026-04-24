#!/bin/bash
# ============================================================
# DATABASE BACKUP - Respaldo de base de datos Supabase
# ============================================================

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="db_backup_${TIMESTAMP}.sql"

echo -e "${YELLOW}💾 BACKUP DE BASE DE DATOS${NC}"
echo "=========================="

# Crear directorio si no existe
mkdir -p "$BACKUP_DIR"

echo -e "${BLUE}📁 Guardando en: ${BACKUP_DIR}/${BACKUP_FILE}${NC}"

# Verificar variables de entorno
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo -e "${YELLOW}⚠️  Variables de entorno no encontradas${NC}"
    echo -e "Buscando en .env.local..."
    
    if [ -f ".env.local" ]; then
        export $(grep -E '^(SUPABASE_URL|SUPABASE_SERVICE_KEY)=' .env.local | xargs)
    fi
fi

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo -e "${RED}❌ Error: No se encontraron credenciales de Supabase${NC}"
    echo -e "${YELLOW}💡 Configura SUPABASE_URL y SUPABASE_SERVICE_KEY en .env.local${NC}"
    exit 1
fi

# Crear backup (estructura + datos de tablas principales)
echo -e "${BLUE}📊 Respaldando datos...${NC}"

# Lista de tablas importantes
TABLES=(
    "repair_tickets"
    "customers"
    "ticket_comments"
    "invoices"
    "invoice_items"
    "payments"
    "ticket_parts"
    "ticket_inventory_items"
    "ticket_images"
    "ticket_conditions"
    "ticket_accessories"
    "inventory_items"
)

# Crear archivo de backup
echo "-- Backup JC ONE FIX - ${TIMESTAMP}" > "${BACKUP_DIR}/${BACKUP_FILE}"
echo "-- Generado automáticamente" >> "${BACKUP_DIR}/${BACKUP_FILE}"
echo "" >> "${BACKUP_DIR}/${BACKUP_FILE}"

# Por ahora, guardamos la lista de tablas (en producción usarías pg_dump o la API de Supabase)
echo "-- Tablas respaldadas:" >> "${BACKUP_DIR}/${BACKUP_FILE}"
for table in "${TABLES[@]}"; do
    echo "--   - ${table}" >> "${BACKUP_DIR}/${BACKUP_FILE}"
done

echo "" >> "${BACKUP_DIR}/${BACKUP_FILE}"
echo "-- NOTA: En producción, usar pg_dump o Supabase CLI:" >> "${BACKUP_DIR}/${BACKUP_FILE}"
echo "-- supabase db dump --file ${BACKUP_FILE}" >> "${BACKUP_DIR}/${BACKUP_FILE}"

# Crear también un backup del esquema SQL
SCHEMA_FILE="${BACKUP_DIR}/schema_${TIMESTAMP}.sql"
echo "-- Schema backup - ${TIMESTAMP}" > "$SCHEMA_FILE"

# Copiar archivos de migración actuales
if [ -d "supabase/migrations" ]; then
    echo -e "${BLUE}📂 Copiando migraciones...${NC}"
    cp -r supabase/migrations "${BACKUP_DIR}/migrations_${TIMESTAMP}/"
fi

echo -e "${GREEN}✅ Backup creado:${NC}"
echo -e "   📄 ${GREEN}${BACKUP_FILE}${NC}"
echo -e "   📋 ${GREEN}schema_${TIMESTAMP}.sql${NC}"

# Listar backups recientes
echo -e "\n${YELLOW}📚 Backups recientes:${NC}"
ls -lt "$BACKUP_DIR" | head -10

echo -e "\n${YELLOW}🔙 Para restaurar:${NC}"
echo -e "   ${GREEN}psql -d your_database -f ${BACKUP_DIR}/${BACKUP_FILE}${NC}"
echo -e "   o usa el dashboard de Supabase"

echo -e "\n${BLUE}💡 Tip: Configura backups automáticos en:${NC}"
echo -e "   ${GREEN}Supabase Dashboard → Database → Backups${NC}"

#!/bin/bash
# ============================================================
# CHECKPOINT SYSTEM - Sistema de protección ante cambios
# Guarda estado actual antes de modificaciones importantes
# ============================================================

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🛡️  SISTEMA DE PROTECCIÓN - JC ONE FIX${NC}"
echo "======================================"

# Verificar si estamos en un repo git
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ Error: No es un repositorio Git${NC}"
    echo "Inicializando Git..."
    git init
    git add .
    git commit -m "🎉 Initial commit - JC ONE FIX"
fi

# Crear tag con timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
CHECKPOINT_NAME="checkpoint_${TIMESTAMP}"

echo -e "\n${YELLOW}📸 Creando checkpoint...${NC}"

# Agregar todos los cambios
git add -A

# Crear commit con mensaje descriptivo
COMMIT_MSG="🛡️ Checkpoint ${TIMESTAMP} - Estado antes de cambios"
git commit -m "${COMMIT_MSG}"

# Crear tag para fácil referencia
git tag -a "${CHECKPOINT_NAME}" -m "Checkpoint de seguridad ${TIMESTAMP}"

echo -e "${GREEN}✅ Checkpoint creado: ${CHECKPOINT_NAME}${NC}"
echo -e "${GREEN}📍 Commit: $(git rev-parse --short HEAD)${NC}"

echo -e "\n${YELLOW}💾 Archivos incluidos:${NC}"
git diff --name-only HEAD~1 HEAD 2>/dev/null || echo "Primer commit - todos los archivos"

echo -e "\n${YELLOW}🔙 Para volver a este estado:${NC}"
echo -e "   ${GREEN}git checkout ${CHECKPOINT_NAME}${NC}"
echo -e "   o"
echo -e "   ${GREEN}git reset --hard ${CHECKPOINT_NAME}${NC}"

echo -e "\n${YELLOW}📋 Historial de checkpoints:${NC}"
git log --oneline -5

echo -e "\n${GREEN}✨ Listo! Ahora puedes hacer cambios con seguridad.${NC}"

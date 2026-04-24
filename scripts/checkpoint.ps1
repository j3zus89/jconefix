# ============================================================
# CHECKPOINT SYSTEM - Sistema de protección ante cambios
# Guarda estado actual antes de modificaciones importantes
# ============================================================

# Colores
$GREEN = "`e[32m"
$YELLOW = "`e[33m"
$RED = "`e[31m"
$NC = "`e[0m" # No Color

Write-Host "$YELLOW🛡️  SISTEMA DE PROTECCIÓN - JC ONE FIX$NC" -ForegroundColor Yellow
Write-Host "======================================"

# Verificar si estamos en un repo git
if (-not (Test-Path ".git")) {
    Write-Host "$RED❌ Error: No es un repositorio Git$NC" -ForegroundColor Red
    Write-Host "Inicializando Git..."
    git init
    git add .
    git commit -m "🎉 Initial commit - JC ONE FIX"
}

# Crear tag con timestamp
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$CHECKPOINT_NAME = "checkpoint_$TIMESTAMP"

Write-Host ""
Write-Host "$YELLOW📸 Creando checkpoint...$NC" -ForegroundColor Yellow

# Agregar todos los cambios
git add -A

# Crear commit con mensaje descriptivo
$COMMIT_MSG = "🛡️ Checkpoint $TIMESTAMP - Estado antes de cambios"
git commit -m "$COMMIT_MSG"

# Crear tag para fácil referencia
git tag -a "$CHECKPOINT_NAME" -m "Checkpoint de seguridad $TIMESTAMP"

$SHORT_HASH = git rev-parse --short HEAD

Write-Host "$GREEN✅ Checkpoint creado: $CHECKPOINT_NAME$NC" -ForegroundColor Green
Write-Host "$GREEN📍 Commit: $SHORT_HASH$NC" -ForegroundColor Green

Write-Host ""
Write-Host "$YELLOW💾 Archivos incluidos:$NC" -ForegroundColor Yellow
git diff --name-only HEAD~1 HEAD 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Primer commit - todos los archivos"
}

Write-Host ""
Write-Host "$YELLOW🔙 Para volver a este estado:$NC" -ForegroundColor Yellow
Write-Host "   $GREENgit checkout $CHECKPOINT_NAME$NC" -ForegroundColor Green
Write-Host "   o" -ForegroundColor Yellow
Write-Host "   $GREENgit reset --hard $CHECKPOINT_NAME$NC" -ForegroundColor Green

Write-Host ""
Write-Host "$YELLOW📋 Historial de checkpoints:$NC" -ForegroundColor Yellow
git log --oneline -5

Write-Host ""
Write-Host "$GREEN✨ Listo! Ahora puedes hacer cambios con seguridad.$NC" -ForegroundColor Green
Write-Host ""
Write-Host "$YELLOW📖 Comandos útiles:$NC" -ForegroundColor Yellow
Write-Host "   Ver todos los checkpoints:  $GREEN git tag -l checkpoint_* $NC" -ForegroundColor Green
Write-Host "   Volver al último checkpoint:$GREEN git reset --hard $CHECKPOINT_NAME $NC" -ForegroundColor Green
Write-Host "   Ver diferencias:            $GREEN git diff $CHECKPOINT_NAME HEAD $NC" -ForegroundColor Green

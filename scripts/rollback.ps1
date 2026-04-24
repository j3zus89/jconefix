# ============================================================
# ROLLBACK - Volver a un checkpoint anterior
# ============================================================

$YELLOW = "Yellow"
$GREEN = "Green"
$RED = "Red"

Write-Host "🔙 ROLLBACK - Volver a estado anterior" -ForegroundColor Yellow
Write-Host "======================================"

# Listar checkpoints disponibles
Write-Host ""
Write-Host "📋 Checkpoints disponibles:" -ForegroundColor Yellow
$checkpoints = git tag -l checkpoint_* | Sort-Object -Descending

if (-not $checkpoints) {
    Write-Host "❌ No hay checkpoints disponibles" -ForegroundColor Red
    Write-Host "💡 Crea uno primero con: .\scripts\checkpoint.ps1"
    exit 1
}

$index = 0
foreach ($cp in $checkpoints) {
    $shortHash = git rev-parse --short $cp
    $date = $cp -replace 'checkpoint_(\d{8})_(\d{6})', '$1 $2'
    Write-Host "   [$index] $cp (commit: $shortHash)" -ForegroundColor Green
    $index++
}

# Preguntar cuál usar
Write-Host ""
$selection = Read-Host "🔢 Ingresa el número del checkpoint al que quieres volver (o 'c' para cancelar)"

if ($selection -eq 'c') {
    Write-Host "❎ Cancelado" -ForegroundColor Yellow
    exit 0
}

# Validar selección
$selectedIndex = [int]$selection
if ($selectedIndex -lt 0 -or $selectedIndex -ge $checkpoints.Count) {
    Write-Host "❌ Selección inválida" -ForegroundColor Red
    exit 1
}

$selectedCheckpoint = $checkpoints[$selectedIndex]

# Confirmación
Write-Host ""
Write-Host "⚠️  ADVERTENCIA" -ForegroundColor Red -BackgroundColor Black
Write-Host "Vas a perder todos los cambios no guardados desde:"
Write-Host "   $selectedCheckpoint" -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "¿Estás seguro? (escribe 'SI' para confirmar)"

if ($confirm -ne 'SI') {
    Write-Host "❎ Cancelado" -ForegroundColor Yellow
    exit 0
}

# Hacer rollback
Write-Host ""
Write-Host "🔄 Volviendo a $selectedCheckpoint..." -ForegroundColor Yellow

try {
    git reset --hard $selectedCheckpoint
    Write-Host ""
    Write-Host "✅ Rollback completado exitosamente!" -ForegroundColor Green
    Write-Host "   Estado restaurado a: $selectedCheckpoint" -ForegroundColor Green
    
    # Mostrar estado actual
    Write-Host ""
    Write-Host "📊 Estado actual:" -ForegroundColor Yellow
    git log --oneline -3
} catch {
    Write-Host "❌ Error durante el rollback: $_" -ForegroundColor Red
}

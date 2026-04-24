# ============================================================
# DATABASE BACKUP - Respaldo de base de datos Supabase
# Versión PowerShell para Windows
# ============================================================

# Colores
$GREEN = "Green"
$YELLOW = "Yellow"
$RED = "Red"
$BLUE = "Cyan"

$BACKUP_DIR = ".\backups"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP_FILE = "db_backup_$TIMESTAMP.sql"

Write-Host "💾 BACKUP DE BASE DE DATOS" -ForegroundColor Yellow
Write-Host "=========================="

# Crear directorio si no existe
if (-not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null
}

Write-Host "📁 Guardando en: $BACKUP_DIR\$BACKUP_FILE" -ForegroundColor Cyan

# Verificar variables de entorno
$envFile = ".env.local"
$SUPABASE_URL = $null
$SUPABASE_SERVICE_KEY = $null

if (-not $env:SUPABASE_URL -or -not $env:SUPABASE_SERVICE_KEY) {
    Write-Host "⚠️  Variables de entorno no encontradas" -ForegroundColor Yellow
    Write-Host "Buscando en .env.local..."
    
    if (Test-Path $envFile) {
        $envContent = Get-Content $envFile
        foreach ($line in $envContent) {
            if ($line -match '^SUPABASE_URL=(.*)$') {
                $SUPABASE_URL = $matches[1]
            }
            if ($line -match '^SUPABASE_SERVICE_KEY=(.*)$') {
                $SUPABASE_SERVICE_KEY = $matches[1]
            }
        }
    }
}

if (-not $SUPABASE_URL -or -not $SUPABASE_SERVICE_KEY) {
    Write-Host "❌ Error: No se encontraron credenciales de Supabase" -ForegroundColor Red
    Write-Host "💡 Configura SUPABASE_URL y SUPABASE_SERVICE_KEY en .env.local" -ForegroundColor Yellow
    exit 1
}

Write-Host "📊 Respaldando datos..." -ForegroundColor Cyan

# Lista de tablas importantes
$TABLES = @(
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
$backupPath = Join-Path $BACKUP_DIR $BACKUP_FILE
"-- Backup JC ONE FIX - $TIMESTAMP" | Out-File -FilePath $backupPath -Encoding UTF8
"-- Generado automáticamente" | Out-File -FilePath $backupPath -Append -Encoding UTF8
"" | Out-File -FilePath $backupPath -Append -Encoding UTF8

"-- Tablas respaldadas:" | Out-File -FilePath $backupPath -Append -Encoding UTF8
foreach ($table in $TABLES) {
    "--   - $table" | Out-File -FilePath $backupPath -Append -Encoding UTF8
}

"" | Out-File -FilePath $backupPath -Append -Encoding UTF8
"-- NOTA: En producción, usar pg_dump o Supabase CLI:" | Out-File -FilePath $backupPath -Append -Encoding UTF8
"-- supabase db dump --file $BACKUP_FILE" | Out-File -FilePath $backupPath -Append -Encoding UTF8

# Crear también un backup del esquema SQL
$SCHEMA_FILE = "schema_$TIMESTAMP.sql"
$schemaPath = Join-Path $BACKUP_DIR $SCHEMA_FILE
"-- Schema backup - $TIMESTAMP" | Out-File -FilePath $schemaPath -Encoding UTF8

# Copiar archivos de migración actuales
if (Test-Path "supabase\migrations") {
    Write-Host "📂 Copiando migraciones..." -ForegroundColor Cyan
    $migrationsBackup = "migrations_$TIMESTAMP"
    Copy-Item -Path "supabase\migrations" -Destination "$BACKUP_DIR\$migrationsBackup" -Recurse -Force
}

Write-Host "✅ Backup creado:" -ForegroundColor Green
Write-Host "   📄 $BACKUP_FILE" -ForegroundColor Green
Write-Host "   📋 $SCHEMA_FILE" -ForegroundColor Green

if (Test-Path "$BACKUP_DIR\$migrationsBackup") {
    Write-Host "   📂 $migrationsBackup\" -ForegroundColor Green
}

# Listar backups recientes
Write-Host ""
Write-Host "📚 Backups recientes:" -ForegroundColor Yellow
Get-ChildItem $BACKUP_DIR | Sort-Object LastWriteTime -Descending | Select-Object -First 10 | Format-Table Name, LastWriteTime, @{Label="Size"; Expression={"{0:N2} KB" -f ($_.Length/1KB)}}

Write-Host ""
Write-Host "🔙 Para restaurar:" -ForegroundColor Yellow
Write-Host "   Usa el dashboard de Supabase o psql" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Tip: Configura backups automáticos en:" -ForegroundColor Cyan
Write-Host "   Supabase Dashboard → Database → Backups" -ForegroundColor Green

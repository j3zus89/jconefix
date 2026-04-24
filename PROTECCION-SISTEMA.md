# 🛡️ SISTEMA DE PROTECCIÓN - JC ONE FIX

## Checkpoint & Rollback System

Este sistema te permite **guardar el estado actual** del código antes de hacer cambios, para poder **volver atrás** si algo se rompe.

---

## 📁 Archivos Creados

| Archivo | Descripción |
|---------|-------------|
| `scripts/checkpoint.ps1` | Crear checkpoint del código (Windows) |
| `scripts/checkpoint.sh` | Crear checkpoint del código (Linux/Mac) |
| `scripts/backup-db.ps1` | Backup de base de datos (Windows) |
| `scripts/backup-db.sh` | Backup de base de datos (Linux/Mac) |

---

## 🚀 CÓMO USAR (Windows)

### 1. Antes de hacer cambios importantes - Crear Checkpoint

```powershell
# Abrir PowerShell en la carpeta del proyecto
cd C:\Users\srgon\CascadeProjects\project\project

# Crear checkpoint de seguridad
.\scripts\checkpoint.ps1
```

Esto creará:
- Un **commit de Git** con timestamp
- Un **tag** llamado `checkpoint_20250331_204500`
- Lista de archivos modificados

### 2. Hacer tus cambios normalmente

Edita archivos, crea funcionalidades, etc.

### 3. Si algo se rompe - Volver atrás

```powershell
# Ver checkpoints disponibles
git tag -l checkpoint_*

# Volver al último checkpoint (⚠️ PERDERÁS cambios no commiteados)
git reset --hard checkpoint_20250331_204500

# O ver qué cambió
git diff checkpoint_20250331_204500 HEAD
```

---

## 💾 BACKUP DE BASE DE DATOS

### Crear backup antes de migraciones:

```powershell
.\scripts\backup-db.ps1
```

Guarda:
- Lista de tablas importantes
- Copia de archivos de migración
- Metadata del backup

Los backups se guardan en `backups/`:
- `db_backup_20250331_204500.sql`
- `schema_20250331_204500.sql`
- `migrations_20250331_204500/`

---

## 🔄 FLUJO DE TRABAJO RECOMENDADO

### Para cambios grandes (nuevas funcionalidades):

```powershell
# 1. Crear checkpoint
.\scripts\checkpoint.ps1

# 2. Backup de DB (si tocas migraciones)
.\scripts\backup-db.ps1

# 3. Hacer tus cambios...
# Editar archivos, crear componentes, etc.

# 4. Si todo funciona - commit normal
git add .
git commit -m "✨ Nueva funcionalidad implementada"

# 5. Si algo falla - rollback
.\scripts\rollback.ps1  # (o git reset --hard checkpoint_XXX)
```

### Para cambios pequeños:

```powershell
# Solo checkpoint
.\scripts\checkpoint.ps1

# Hacer cambios
# Si falla: git checkout -- .
```

---

## 🆘 COMANDOS DE EMERGENCIA

### ¿Se rompió todo? Volver al estado anterior:

```powershell
# Opción 1: Volver al último checkpoint
git reset --hard checkpoint_20250331_204500

# Opción 2: Volver al commit anterior (más seguro)
git reset --soft HEAD~1
git checkout -- .

# Opción 3: Volver a un commit específico
git log --oneline -10  # Ver historial
git reset --hard a1b2c3d  # Código del commit
```

### ¿Perdiste archivos no guardados?

```powershell
# Ver si Git los tiene en stash
git stash list
git stash pop

# O recuperar de un checkpoint anterior
git checkout checkpoint_anterior -- .
```

---

## 📊 VER ESTADO

```powershell
# Ver todos los checkpoints
git tag -l checkpoint_*

# Ver historial de commits
git log --oneline --graph -15

# Ver qué cambió desde el último checkpoint
git diff checkpoint_20250331_204500

# Ver archivos modificados
git status
```

---

## 🎯 EJEMPLO REAL

### Escenario: "Implementar sistema de facturación"

```powershell
# Paso 1: Protección
.\scripts\checkpoint.ps1
# ✅ Checkpoint creado: checkpoint_20250331_210000

# Paso 2: Crear migración SQL
code supabase/migrations/20250331001_nueva_factura.sql

# Paso 3: Backup de seguridad
.\scripts\backup-db.ps1
# ✅ Backup guardado en backups/

# Paso 4: Implementar código
# ... editar archivos ...

# Paso 5: Testear
npm run build
npm run dev

# ❌ ERROR: Algo falló!

# Paso 6: ROLLBACK
.\scripts\rollback.ps1
# o manualmente:
git reset --hard checkpoint_20250331_210000

# Todo vuelve al estado anterior ✅
```

---

## 🔧 CONFIGURACIÓN AVANZADA

### Checkpoints automáticos antes de cada comando:

Agrega a tu PowerShell profile (`$PROFILE`):

```powershell
# Auto-checkpoint antes de cambios grandes
function Safe-Edit {
    param([string]$Message)
    & "C:\Users\srgon\CascadeProjects\project\project\scripts\checkpoint.ps1"
    Write-Host "🛡️ Checkpoint creado. Ahora puedes editar con seguridad." -ForegroundColor Green
}

# Uso: Safe-Edit "Implementando login"
```

### Alias útiles:

```powershell
# En PowerShell
Set-Alias -Name savepoint -Value C:\Users\srgon\CascadeProjects\project\project\scripts\checkpoint.ps1
Set-Alias -Name backupdb -Value C:\Users\srgon\CascadeProjects\project\project\scripts\backup-db.ps1

# Uso rápido:
savepoint    # Crear checkpoint
backupdb     # Backup de DB
```

---

## ⚠️ IMPORTANTE

1. **Siempre** crea checkpoint antes de:
   - Modificar archivos grandes (`page.tsx`)
   - Crear nuevas migraciones SQL
   - Borrar código existente
   - Cambiar configuraciones

2. **Haz backup de DB** antes de:
   - Ejecutar migraciones
   - Modificar tablas existentes
   - Borrar datos

3. **Los checkpoints NO guardan**:
   - Cambios no commiteados
   - Archivos en `.gitignore`
   - Node_modules

4. **Para borrar checkpoints viejos**:
   ```powershell
   git tag -d checkpoint_20250331_120000
   ```

---

## 🆘 SOPORTE

Si algo sale mal:

1. **No entres en pánico** 🧘
2. Revisa checkpoints: `git tag -l checkpoint_*`
3. Vuelve al último funcionando: `git reset --hard checkpoint_XXX`
4. Si no hay checkpoints: `git log` y `git reset --hard COMMIT_ID`

---

**Creado:** Marzo 2026  
**Versión:** 1.0  
**Estado:** 🟢 Listo para usar

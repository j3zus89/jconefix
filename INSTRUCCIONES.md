# RepairDesk - Sistema de Gestión de Talleres de Reparación

## 🎯 CREDENCIALES DE DEMOSTRACIÓN

Para probar la aplicación sin necesidad de registrarte, usa estas credenciales:

**Email:** `demo@repairdesk.com`
**Contraseña:** `demo123456`

### Crear el Usuario Demo

Si el usuario demo no existe aún, sigue estos pasos:

1. Abre tu navegador y ve a: `http://localhost:3000/demo-setup`
2. Haz clic en el botón "Crear Usuario Demo"
3. Espera a que se cree el usuario con datos de ejemplo
4. Ahora puedes ir a `/login` y usar las credenciales de arriba

---

## 🚀 Inicio Rápido

### 1. Instalar dependencias
```bash
npm install
```

### 2. Iniciar el servidor de desarrollo
```bash
npm run dev
```

### 3. Abrir en el navegador
```
http://localhost:3000
```

---

## 📋 Funcionalidades Implementadas

### ✅ Autenticación Completa
- Registro de usuarios
- Inicio de sesión
- Cierre de sesión
- Rutas protegidas
- Sesiones persistentes con Supabase Auth

### ✅ Panel Principal (Dashboard)
- Estadísticas en tiempo real
- Total de tickets, ingresos y clientes
- Tickets pendientes y completados
- Alertas de bajo stock en inventario
- Vista de tickets recientes

### ✅ Gestión de Tickets de Reparación
- **Crear** nuevos tickets con:
  - Información del cliente
  - Tipo de dispositivo y modelo
  - Descripción del problema
  - Estado (pendiente, en proceso, completado, cancelado)
  - Prioridad (baja, media, alta, urgente)
  - Costos estimados y finales
- **Editar** tickets existentes
- **Eliminar** tickets
- **Buscar** por número de ticket, dispositivo o cliente
- Filtros por estado

### ✅ Gestión de Clientes
- **Crear** clientes con:
  - Nombre y datos de contacto
  - Email y teléfono
  - Dirección
  - Notas adicionales
- **Editar** información de clientes
- **Eliminar** clientes
- **Buscar** clientes por nombre, email o teléfono
- Vinculación automática con tickets

### ✅ Gestión de Inventario
- **Agregar** productos/partes al inventario
- Información detallada:
  - Nombre y SKU
  - Categoría
  - Cantidad actual
  - Cantidad mínima (alertas de stock bajo)
  - Precio de costo y venta
  - Proveedor
- **Editar** items del inventario
- **Eliminar** items
- **Buscar** por nombre, SKU o categoría
- Alertas automáticas de stock bajo

---

## 🗄️ Base de Datos

La aplicación usa **Supabase** como base de datos PostgreSQL con las siguientes tablas:

### `profiles`
Información extendida del usuario
- ID del usuario (vinculado a auth.users)
- Nombre completo
- Nombre del taller

### `customers`
Base de datos de clientes
- ID único
- Información de contacto (email, teléfono)
- Dirección
- Notas

### `repair_tickets`
Tickets de reparación
- Número de ticket único
- Cliente asociado
- Información del dispositivo
- Estado y prioridad
- Costos
- Notas

### `inventory_items`
Inventario de partes y suministros
- Nombre y SKU
- Cantidad actual y mínima
- Precios
- Categoría y proveedor

### 🔒 Seguridad
- **Row Level Security (RLS)** activado en todas las tablas
- Los usuarios solo pueden ver y modificar sus propios datos
- Políticas restrictivas por defecto
- Autenticación segura con Supabase Auth

---

## 🌐 Interfaz

### Todo está en ESPAÑOL
- Landing page
- Páginas de autenticación
- Dashboard completo
- Todos los formularios
- Mensajes de notificación

### Diseño Profesional
- Colores: Azul y gris (no violeta)
- Interfaz moderna y limpia
- Completamente responsive
- Notificaciones toast para feedback
- Estados de carga en todas las operaciones

---

## 📱 Flujo de Usuario

1. **Inicio** → Landing page en `/`
2. **Registro** → Crear cuenta en `/register`
3. **Login** → Iniciar sesión en `/login`
4. **Dashboard** → Panel principal con estadísticas
5. **Gestionar** → Crear y administrar:
   - Tickets de reparación
   - Clientes
   - Inventario

---

## 🛠️ Stack Tecnológico

- **Frontend:** Next.js 13 (App Router), React, TypeScript
- **Estilos:** TailwindCSS, shadcn/ui
- **Backend:** Next.js API Routes
- **Base de Datos:** PostgreSQL (Supabase)
- **Autenticación:** Supabase Auth
- **ORM:** Cliente de Supabase
- **Notificaciones:** Sonner (toast)

---

## 📝 Datos de Ejemplo

El usuario demo incluye:
- 2 clientes de ejemplo
- 2 tickets de reparación
- 2 items en el inventario

Todos con información realista en español.

---

## 🔧 Comandos Útiles

```bash
# Desarrollo
npm run dev

# Compilar para producción
npm run build

# Iniciar en producción
npm start

# Verificar tipos de TypeScript
npm run typecheck
```

---

## ⚠️ Importante

1. La aplicación está completamente funcional y lista para usar
2. Todos los datos se guardan en la base de datos real de Supabase
3. Cada usuario tiene sus datos aislados (no puede ver datos de otros usuarios)
4. Las credenciales de Supabase ya están configuradas en el archivo `.env`

---

## 🎨 Capturas de Pantalla Funcionales

La aplicación incluye:
- ✅ Landing page con hero y secciones de características
- ✅ Formularios de registro y login completamente funcionales
- ✅ Dashboard con estadísticas reales de la base de datos
- ✅ CRUD completo para tickets, clientes e inventario
- ✅ Búsqueda y filtrado en todas las secciones
- ✅ Responsive design

---

## 💡 Próximos Pasos Sugeridos

Para expandir la aplicación, podrías agregar:
- Exportación de reportes a PDF
- Gráficos de ingresos mensuales
- Sistema de notificaciones por email
- Impresión de tickets para clientes
- Gestión de múltiples empleados
- Sistema de citas/agenda

---

## 📞 Soporte

Esta es una aplicación de demostración completamente funcional. Todos los módulos principales están implementados y probados.

**¡Disfruta gestionando tu taller de reparación!**

# RepairDesk - Sistema de Gestión de Talleres de Reparación

Sistema SaaS completo para gestión de talleres de reparación de móviles y ordenadores.

## 🎯 CREDENCIALES DEMO

Usa estas credenciales para acceder inmediatamente:

```
Email: demo@repairdesk.com
Contraseña: demo123456
```

### Crear Usuario Demo (Si no existe)

1. Abre: `http://localhost:3000/demo-setup`
2. Haz clic en "Crear Usuario Demo"
3. Ve a `/login` y usa las credenciales de arriba

---

## 🚀 Inicio Rápido

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm run dev

# 3. Abrir en navegador
http://localhost:3000
```

---

## ✨ Características Implementadas

### ✅ Autenticación Completa
- Registro de usuarios
- Inicio de sesión
- Cierre de sesión
- Rutas protegidas
- Middleware de autenticación

### ✅ Panel Principal
- **Estadísticas en tiempo real:**
  - Total de tickets de reparación
  - Ingresos totales
  - Total de clientes
  - Reparaciones pendientes
  - Reparaciones completadas
  - Productos con stock bajo
- Vista de tickets recientes
- Dashboard responsive

### ✅ Gestión de Tickets de Reparación (CRUD Completo)
- **Crear tickets** con información completa:
  - Cliente asociado
  - Tipo de dispositivo y modelo
  - Número de serie
  - Descripción del problema
  - Estado (pendiente, en proceso, completado, cancelado)
  - Prioridad (baja, media, alta, urgente)
  - Costo estimado y final
  - Notas adicionales
- **Editar** tickets existentes
- **Eliminar** tickets
- **Buscar** por número, dispositivo o cliente
- **Filtrar** por estado y prioridad
- Generación automática de número de ticket

### ✅ Gestión de Clientes (CRUD Completo)
- **Crear** clientes con:
  - Nombre completo
  - Email y teléfono
  - Dirección
  - Notas
- **Editar** información de clientes
- **Eliminar** clientes
- **Buscar** por nombre, email o teléfono
- Vinculación automática con tickets

### ✅ Gestión de Inventario (CRUD Completo)
- **Agregar** productos y partes:
  - Nombre y SKU
  - Categoría
  - Cantidad actual
  - Cantidad mínima (alertas automáticas)
  - Precio de costo
  - Precio de venta
  - Proveedor
  - Notas
- **Editar** items
- **Eliminar** items
- **Buscar** por nombre, SKU o categoría
- **Alertas** de stock bajo

---

## 🗄️ Base de Datos

### Supabase PostgreSQL

**Tablas principales:**

#### `profiles`
- Información del usuario y taller
- Vinculado a auth.users

#### `customers`
- Base de datos de clientes
- Email, teléfono, dirección, notas

#### `repair_tickets`
- Tickets de reparación completos
- Número único, dispositivo, estado, prioridad, costos
- Relación con customers

#### `inventory_items`
- Inventario de partes y suministros
- SKU, cantidad, precios, categoría

### 🔒 Seguridad
- **Row Level Security (RLS)** activado en todas las tablas
- Políticas restrictivas (usuarios solo ven sus datos)
- Autenticación segura con Supabase Auth
- Contraseñas hasheadas automáticamente

---

## 🌐 Todo en Español

- ✅ Landing page completamente en español
- ✅ Páginas de autenticación (login/registro)
- ✅ Dashboard y estadísticas
- ✅ Todos los formularios
- ✅ Notificaciones y mensajes
- ✅ Sidebar de navegación
- ✅ Todos los labels y placeholders

---

## 📱 Flujo de Usuario

1. **Página principal** → Landing page con información del producto
2. **Registro** → Crear cuenta con nombre y datos del taller
3. **Login** → Iniciar sesión (o usar credenciales demo)
4. **Dashboard** → Ver estadísticas del negocio
5. **Gestionar:**
   - Crear clientes
   - Crear tickets de reparación
   - Administrar inventario
   - Ver reportes y estadísticas

---

## 🛠️ Stack Tecnológico

- **Frontend:** Next.js 13 (App Router), React 18, TypeScript
- **Estilos:** TailwindCSS, shadcn/ui
- **Base de datos:** PostgreSQL (Supabase)
- **Autenticación:** Supabase Auth
- **Notificaciones:** Sonner
- **Iconos:** Lucide React

---

## 📊 Datos Demo Incluidos

El usuario demo incluye:
- **2 clientes:** Juan Pérez, María García
- **2 tickets:** iPhone 13 Pro, Samsung Galaxy S21
- **2 productos:** Pantalla iPhone, Batería Samsung

Todo con información realista en español.

---

## 🎨 Diseño

- **Colores:** Azul y gris (profesional)
- **Responsive:** Funciona en móvil, tablet y desktop
- **Moderno:** Interfaces limpias y claras
- **UX:** Notificaciones toast, estados de carga
- **Accesibilidad:** Diseño intuitivo

---

## 🔧 Comandos

```bash
# Desarrollo
npm run dev

# Compilar para producción
npm run build

# Ejecutar en producción
npm start

# Verificar tipos
npm run typecheck
```

---

## 📝 Estructura del Proyecto

```
├── app/
│   ├── dashboard/          # Panel principal
│   │   ├── customers/      # Gestión de clientes
│   │   ├── inventory/      # Gestión de inventario
│   │   └── tickets/        # Tickets de reparación
│   ├── demo-setup/         # Crear usuario demo
│   ├── login/              # Iniciar sesión
│   ├── register/           # Registro
│   └── page.tsx            # Landing page
├── components/
│   ├── dashboard/          # Componentes del dashboard
│   └── ui/                 # Componentes UI (shadcn)
├── lib/
│   └── supabase/          # Cliente Supabase
├── middleware.ts          # Protección de rutas
└── supabase/
    └── migrations/        # Migraciones de BD
```

---

## ⚠️ Importante

1. **Base de datos:** Ya está configurada con Supabase
2. **Variables de entorno:** Ya configuradas en `.env`
3. **Autenticación:** Completamente funcional
4. **Datos aislados:** Cada usuario solo ve sus propios datos
5. **Producción lista:** Listo para deploy en Vercel

---

## 🐛 Solución de Problemas

### El login no funciona
1. Ve a `/demo-setup` para crear el usuario demo
2. O regístrate en `/register` con tu email

### No puedo acceder al dashboard
- Asegúrate de estar autenticado
- El middleware redirige automáticamente a `/login`

### No veo datos
- Usa el usuario demo (tiene datos de ejemplo)
- O crea tus propios clientes, tickets e inventario

---

## 🚀 Deploy

El proyecto está listo para Vercel:

```bash
# Push a GitHub
git push origin main

# Conecta en Vercel
# Las variables de entorno ya están configuradas
```

---

## 📄 Licencia

Proyecto de demostración - Todos los derechos reservados

---

**¡Disfruta gestionando tu taller de reparación!** 🔧

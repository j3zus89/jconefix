# MAIA Widget - Módulo de Supervisión WhatsApp

## Descripción

Widget de React para supervisar y gestionar conversaciones del bot MAIA (WhatsApp AI) desde el dashboard del panel.

## Características

- **Widget Flotante**: Icono de WhatsApp flotante cerca del chat interno del dashboard
- **Vista de Supervisión**: Panel lateral con flujo de mensajes en tiempo real
- **Diferenciación Visual**: Mensajes de IA (verde), Cliente (gris), Técnico (azul)
- **Intervención Humana**: Campo de texto para enviar mensajes manualmente
- **Lógica de Silencio**: La IA se pausa 10 minutos tras intervención manual
- **Estado de Conexión**: Muestra si WhatsApp está Conectado o requiere QR

## Estructura de Archivos

```
components/maia/
├── MaiaFloatingWidget.tsx    # Widget flotante con badge de estado
├── MaiaChatPanel.tsx         # Panel lateral con mensajes y conversaciones
├── index.ts                  # Exportaciones públicas
└── README.md                 # Este archivo
```

## API Routes

- `GET /api/maia/conversations` - Listar conversaciones activas
- `GET /api/maia/messages?conversationId={id}` - Obtener mensajes de una conversación
- `POST /api/maia/messages` - Enviar mensaje manual (intervención)
- `GET /api/maia/status` - Obtener estado de conexión de WhatsApp

## Tablas de Supabase

### whatsapp_conversations
- Almacena una conversación por chat/número de cliente
- Campos clave: `chat_id`, `ai_enabled`, `ai_paused_until`, `ai_pause_reason`

### whatsapp_messages
- Almacena cada mensaje individual
- Campos clave: `sender_type` (customer|ai|human), `content`, `conversation_id`

### whatsapp_connection_status
- Estado de conexión del bot MAIA por organización
- Campos clave: `status`, `qr_code`, `qr_expires_at`

### whatsapp_human_interventions
- Auditoría de intervenciones manuales de técnicos

## Funciones RPC

- `is_ai_silenced(conversation_id)` - Verifica si IA está silenciada
- `silence_ai_for_conversation(conversation_id, minutes, reason)` - Silenciar IA
- `unsilence_ai_for_conversation(conversation_id)` - Reactivar IA manualmente

## Uso

El widget se integra automáticamente en el dashboard layout (`app/dashboard/layout.tsx`).
Aparece como un botón flotante "MAIA" junto al chat interno.

## Sincronización con maia-bot

El bot MAIA en `maia-bot/` sincroniza automáticamente:
- Mensajes entrantes del cliente → Supabase
- Respuestas de la IA → Supabase
- Estado de conexión WhatsApp → Supabase
- Verifica silencio de IA antes de responder

## Flujo de Intervención Humana

1. Técnico abre el widget MAIA
2. Selecciona una conversación activa
3. Escribe y envía mensaje manual
4. API automáticamente:
   - Inserta mensaje como `sender_type: 'human'`
   - Llama RPC `silence_ai_for_conversation(10 min)`
   - Registra intervención en `whatsapp_human_interventions`
5. IA no responde en esa conversación durante 10 minutos
6. Widget muestra contador de tiempo restante de silencio

## Realtime

El panel se suscribe a cambios en tiempo real de:
- `whatsapp_messages` - Nuevos mensajes en conversación activa
- `whatsapp_conversations` - Actualizaciones de estado
- `whatsapp_connection_status` - Cambios de conexión

-- MAIA WhatsApp Conversations Module
-- Tablas para el widget de supervisión de conversaciones MAIA en el dashboard

-- Tabla de conversaciones de WhatsApp (una por chat/número de cliente)
create table if not exists public.whatsapp_conversations (
    id uuid primary key default gen_random_uuid(),
    chat_id text not null, -- número de teléfono del cliente @s.whatsapp.net
    customer_name text,
    customer_phone text, -- número formateado para mostrar
    organization_id uuid not null references public.organizations(id) on delete cascade,
    status text not null default 'active' check (status in ('active', 'closed', 'spam')),
    
    -- Estado de la IA
    ai_enabled boolean not null default true,
    ai_paused_until timestamp with time zone, -- null = IA activa, con fecha = silenciada hasta
    ai_pause_reason text, -- 'human_intervention', 'manual', etc.
    
    -- Metadata del bot MAIA
    last_bot_message_at timestamp with time zone,
    last_customer_message_at timestamp with time zone,
    
    -- Contadores
    total_messages integer not null default 0,
    ai_messages_count integer not null default 0,
    human_messages_count integer not null default 0,
    
    -- Contexto de la conversación
    context jsonb default '{}',
    
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    
    constraint unique_chat_org unique (chat_id, organization_id)
);

comment on table public.whatsapp_conversations is 'Conversaciones de WhatsApp gestionadas por MAIA';
comment on column public.whatsapp_conversations.ai_paused_until is 'Timestamp hasta cuando la IA está silenciada (10 min tras intervención humana)';
comment on column public.whatsapp_conversations.chat_id is 'ID único de WhatsApp (número@s.whatsapp.net)';

-- Tabla de mensajes de WhatsApp
create table if not exists public.whatsapp_messages (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
    organization_id uuid not null references public.organizations(id) on delete cascade,
    
    -- Información del mensaje
    message_type text not null default 'text' check (message_type in ('text', 'image', 'document', 'audio', 'video', 'location', 'template')),
    content text not null,
    
    -- Quién envió el mensaje
    sender_type text not null check (sender_type in ('customer', 'ai', 'human')),
    sender_name text, -- nombre mostrado (MAIA, Técnico, Cliente)
    sender_id uuid, -- usuario del panel si es humano
    
    -- Metadata de WhatsApp
    whatsapp_message_id text, -- ID del mensaje en WhatsApp
    whatsapp_status text default 'sent' check (whatsapp_status in ('pending', 'sent', 'delivered', 'read', 'failed')),
    
    -- Para mensajes de IA
    ai_intent text, -- presupuesto, reparacion, consulta, etc.
    ai_confidence float, -- confianza de la clasificación
    
    created_at timestamp with time zone not null default now(),
    
    -- Índices
    constraint whatsapp_messages_conversation_fk foreign key (conversation_id) references public.whatsapp_conversations(id)
);

comment on table public.whatsapp_messages is 'Mensajes individuales de conversaciones MAIA';
comment on column public.whatsapp_messages.sender_type is 'customer=cliente, ai=MAIA, human=técnico del panel';

-- Tabla de estado de conexión de WhatsApp por organización
create table if not exists public.whatsapp_connection_status (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null unique references public.organizations(id) on delete cascade,
    
    -- Estado de conexión
    status text not null default 'disconnected' check (status in ('connected', 'connecting', 'disconnected', 'qr_required', 'error')),
    
    -- QR para escanear (cuando aplica)
    qr_code text, -- código QR base64 o string
    qr_expires_at timestamp with time zone,
    
    -- Información de la sesión
    connected_at timestamp with time zone,
    disconnected_at timestamp with time zone,
    
    -- Metadata del dispositivo
    device_info jsonb default '{}',
    
    -- Logs de conexión
    last_error text,
    error_count integer not null default 0,
    
    updated_at timestamp with time zone not null default now(),
    created_at timestamp with time zone not null default now()
);

comment on table public.whatsapp_connection_status is 'Estado de conexión del bot MAIA por organización';

-- Tabla de intervenciones humanas (auditoría)
create table if not exists public.whatsapp_human_interventions (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
    organization_id uuid not null references public.organizations(id) on delete cascade,
    user_id uuid not null references auth.users(id),
    
    -- Detalles de la intervención
    message_sent text not null,
    ai_paused_duration_minutes integer not null default 10,
    
    -- Resultado
    customer_replied boolean default false,
    customer_reply_at timestamp with time zone,
    
    created_at timestamp with time zone not null default now()
);

comment on table public.whatsapp_human_interventions is 'Registro de cuando un técnico interviene manualmente';

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

drop trigger if exists set_updated_at_whatsapp_conversations on public.whatsapp_conversations;
create trigger set_updated_at_whatsapp_conversations
    before update on public.whatsapp_conversations
    for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_whatsapp_connection_status on public.whatsapp_connection_status;
create trigger set_updated_at_whatsapp_connection_status
    before update on public.whatsapp_connection_status
    for each row execute function public.set_updated_at();

-- Trigger para actualizar contadores de mensajes
create or replace function public.update_conversation_message_counts()
returns trigger as $$
begin
    -- Actualizar contadores según el tipo de sender
    if new.sender_type = 'customer' then
        update public.whatsapp_conversations
        set total_messages = total_messages + 1,
            last_customer_message_at = new.created_at,
            updated_at = now()
        where id = new.conversation_id;
    elsif new.sender_type = 'ai' then
        update public.whatsapp_conversations
        set total_messages = total_messages + 1,
            ai_messages_count = ai_messages_count + 1,
            last_bot_message_at = new.created_at,
            updated_at = now()
        where id = new.conversation_id;
    elsif new.sender_type = 'human' then
        update public.whatsapp_conversations
        set total_messages = total_messages + 1,
            human_messages_count = human_messages_count + 1,
            updated_at = now()
        where id = new.conversation_id;
    end if;
    
    return new;
end;
$$ language plpgsql;

drop trigger if exists update_conversation_counts on public.whatsapp_messages;
create trigger update_conversation_counts
    after insert on public.whatsapp_messages
    for each row execute function public.update_conversation_message_counts();

-- Función para verificar si la IA está silenciada
create or replace function public.is_ai_silenced(p_conversation_id uuid)
returns boolean as $$
declare
    v_paused_until timestamp with time zone;
begin
    select ai_paused_until into v_paused_until
    from public.whatsapp_conversations
    where id = p_conversation_id;
    
    -- Si no hay fecha de pausa, la IA está activa
    if v_paused_until is null then
        return false;
    end if;
    
    -- Si la fecha de pausa ya pasó, la IA está activa
    if v_paused_until < now() then
        -- Auto-limpiar el silencio
        update public.whatsapp_conversations
        set ai_paused_until = null,
            ai_pause_reason = null,
            ai_enabled = true
        where id = p_conversation_id;
        return false;
    end if;
    
    return true;
end;
$$ language plpgsql security definer;

-- Función para silenciar la IA (llamada cuando técnico interviene)
create or replace function public.silence_ai_for_conversation(
    p_conversation_id uuid,
    p_minutes integer default 10,
    p_reason text default 'human_intervention'
)
returns void as $$
begin
    update public.whatsapp_conversations
    set ai_paused_until = now() + (p_minutes || ' minutes')::interval,
        ai_pause_reason = p_reason,
        ai_enabled = false
    where id = p_conversation_id;
end;
$$ language plpgsql security definer;

-- Función para reactivar la IA manualmente
create or replace function public.unsilence_ai_for_conversation(p_conversation_id uuid)
returns void as $$
begin
    update public.whatsapp_conversations
    set ai_paused_until = null,
        ai_pause_reason = null,
        ai_enabled = true
    where id = p_conversation_id;
end;
$$ language plpgsql security definer;

-- Índices para performance
DROP INDEX IF EXISTS idx_whatsapp_conversations_org;
CREATE INDEX idx_whatsapp_conversations_org ON public.whatsapp_conversations(organization_id);

DROP INDEX IF EXISTS idx_whatsapp_conversations_chat_id;
CREATE INDEX idx_whatsapp_conversations_chat_id ON public.whatsapp_conversations(chat_id);

DROP INDEX IF EXISTS idx_whatsapp_conversations_status;
CREATE INDEX idx_whatsapp_conversations_status ON public.whatsapp_conversations(status) where status = 'active';

DROP INDEX IF EXISTS idx_whatsapp_conversations_ai_paused;
CREATE INDEX idx_whatsapp_conversations_ai_paused ON public.whatsapp_conversations(ai_paused_until) where ai_paused_until is not null;

DROP INDEX IF EXISTS idx_whatsapp_messages_conversation;
CREATE INDEX idx_whatsapp_messages_conversation ON public.whatsapp_messages(conversation_id);

DROP INDEX IF EXISTS idx_whatsapp_messages_org;
CREATE INDEX idx_whatsapp_messages_org ON public.whatsapp_messages(organization_id);

DROP INDEX IF EXISTS idx_whatsapp_messages_created;
CREATE INDEX idx_whatsapp_messages_created ON public.whatsapp_messages(created_at desc);

DROP INDEX IF EXISTS idx_whatsapp_messages_sender_type;
CREATE INDEX idx_whatsapp_messages_sender_type ON public.whatsapp_messages(sender_type);

DROP INDEX IF EXISTS idx_whatsapp_human_interventions_conversation;
CREATE INDEX idx_whatsapp_human_interventions_conversation ON public.whatsapp_human_interventions(conversation_id);

-- RLS Policies
alter table public.whatsapp_conversations enable row level security;
alter table public.whatsapp_messages enable row level security;
alter table public.whatsapp_connection_status enable row level security;
alter table public.whatsapp_human_interventions enable row level security;

-- Policies para whatsapp_conversations
DROP POLICY IF EXISTS "whatsapp_conversations_org_members_select" ON public.whatsapp_conversations;
CREATE POLICY "whatsapp_conversations_org_members_select"
    ON public.whatsapp_conversations FOR SELECT
    USING (
        organization_id in (
            select organization_id from public.organization_members
            where user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "whatsapp_conversations_org_members_insert" ON public.whatsapp_conversations;
CREATE POLICY "whatsapp_conversations_org_members_insert"
    ON public.whatsapp_conversations FOR INSERT
    WITH CHECK (
        organization_id in (
            select organization_id from public.organization_members
            where user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "whatsapp_conversations_org_members_update" ON public.whatsapp_conversations;
CREATE POLICY "whatsapp_conversations_org_members_update"
    ON public.whatsapp_conversations FOR UPDATE
    USING (
        organization_id in (
            select organization_id from public.organization_members
            where user_id = auth.uid()
        )
    );

-- Policies para whatsapp_messages
DROP POLICY IF EXISTS "whatsapp_messages_org_members_select" ON public.whatsapp_messages;
CREATE POLICY "whatsapp_messages_org_members_select"
    ON public.whatsapp_messages FOR SELECT
    USING (
        organization_id in (
            select organization_id from public.organization_members
            where user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "whatsapp_messages_org_members_insert" ON public.whatsapp_messages;
CREATE POLICY "whatsapp_messages_org_members_insert"
    ON public.whatsapp_messages FOR INSERT
    WITH CHECK (
        organization_id in (
            select organization_id from public.organization_members
            where user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "whatsapp_messages_org_members_update" ON public.whatsapp_messages;
CREATE POLICY "whatsapp_messages_org_members_update"
    ON public.whatsapp_messages FOR UPDATE
    USING (
        organization_id in (
            select organization_id from public.organization_members
            where user_id = auth.uid()
        )
    );

-- Policies para whatsapp_connection_status
DROP POLICY IF EXISTS "whatsapp_connection_status_org_members_select" ON public.whatsapp_connection_status;
CREATE POLICY "whatsapp_connection_status_org_members_select"
    ON public.whatsapp_connection_status FOR SELECT
    USING (
        organization_id in (
            select organization_id from public.organization_members
            where user_id = auth.uid()
        )
    );

-- Solo super admins o el sistema pueden modificar el estado de conexión
DROP POLICY IF EXISTS "whatsapp_connection_status_super_admin_all" ON public.whatsapp_connection_status;
CREATE POLICY "whatsapp_connection_status_super_admin_all"
    ON public.whatsapp_connection_status FOR ALL
    USING (
        (select is_super_admin())
    );

-- Policies para whatsapp_human_interventions
DROP POLICY IF EXISTS "whatsapp_interventions_org_members_select" ON public.whatsapp_human_interventions;
CREATE POLICY "whatsapp_interventions_org_members_select"
    ON public.whatsapp_human_interventions FOR SELECT
    USING (
        organization_id in (
            select organization_id from public.organization_members
            where user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "whatsapp_interventions_org_members_insert" ON public.whatsapp_human_interventions;
CREATE POLICY "whatsapp_interventions_org_members_insert"
    ON public.whatsapp_human_interventions FOR INSERT
    WITH CHECK (
        organization_id in (
            select organization_id from public.organization_members
            where user_id = auth.uid()
        )
        and user_id = auth.uid()
    );

-- Realtime (ignorar error si ya existe)
do $$
begin
    alter publication supabase_realtime add table public.whatsapp_conversations;
exception when duplicate_object then
    raise notice 'Table whatsapp_conversations already in realtime';
end;
$$;

do $$
begin
    alter publication supabase_realtime add table public.whatsapp_messages;
exception when duplicate_object then
    raise notice 'Table whatsapp_messages already in realtime';
end;
$$;

do $$
begin
    alter publication supabase_realtime add table public.whatsapp_connection_status;
exception when duplicate_object then
    raise notice 'Table whatsapp_connection_status already in realtime';
end;
$$;

-- Comentario final
comment on schema public is 'Tablas MAIA: whatsapp_conversations, whatsapp_messages, whatsapp_connection_status, whatsapp_human_interventions';

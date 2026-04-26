import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { humanizeSupportChatDbError } from '@/lib/supabase-setup-hints';
import { deleteSupportChatMessagesForUser, enableBotForUser } from '@/lib/support-bot';
import { notifyAdminSupportMessage } from '@/lib/notifications/admin-alert';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: threadRow } = await supabase
      .from('support_chat_threads')
      .select('client_reset_after_at')
      .eq('user_id', user.id)
      .maybeSingle();

    const cutoff =
      (threadRow as { client_reset_after_at?: string | null } | null)?.client_reset_after_at ?? null;

    let msgQuery = supabase
      .from('support_chat_messages')
      .select(
        'id, sender, body, created_at, organization_id, attachment_url, is_bot_message, admin_sender_avatar_url, admin_sender_display_name',
      )
      .eq('user_id', user.id);

    if (cutoff) {
      msgQuery = msgQuery.gt('created_at', cutoff);
    }

    const { data, error } = await msgQuery.order('created_at', { ascending: true }).limit(500);

    if (error) {
      return NextResponse.json({ error: humanizeSupportChatDbError(error.message) }, { status: 500 });
    }

    // No marcar lectura aquí: el layout hace polling con el chat cerrado y falsearía los ✓✓ del admin.
    // El cliente marca vía RPC solo con el diálogo de soporte abierto (SupportContactDialog + Realtime).
    return NextResponse.json({ messages: data ?? [], client_reset_after_at: cutoff });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    let bodyJson: { body?: string; attachment_url?: string | null };
    try {
      bodyJson = await req.json();
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }

    const attachmentUrl = String(bodyJson.attachment_url ?? '').trim();
    if (attachmentUrl) {
      return NextResponse.json(
        { error: 'Los adjuntos no están disponibles desde el panel del taller.' },
        { status: 403 },
      );
    }
    const text = String(bodyJson.body ?? '').trim();
    if (!text || text.length > 8000) {
      return NextResponse.json({ error: 'Mensaje vacío o demasiado largo' }, { status: 400 });
    }

    const { data: rows } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('joined_at', { ascending: true })
      .limit(1);

    const organization_id =
      (rows?.[0] as { organization_id?: string } | undefined)?.organization_id ?? null;

    const { error } = await supabase.from('support_chat_messages').insert({
      user_id: user.id,
      organization_id,
      sender: 'user',
      body: text,
    });

    if (error) {
      return NextResponse.json({ error: humanizeSupportChatDbError(error.message) }, { status: 500 });
    }

    // Obtener datos del usuario para la notificación
    const [{ data: profile }, { data: org }, { data: previousMessages }] = await Promise.all([
      supabase.from('profiles').select('first_name, last_name').eq('id', user.id).maybeSingle(),
      organization_id
        ? supabase.from('organizations').select('name').eq('id', organization_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from('support_chat_messages').select('id').eq('user_id', user.id).limit(1),
    ]);

    const userName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim() || 'Usuario';
    const organizationName = org?.name ?? null;

    // Notificar al admin SOLO si es el primer mensaje del usuario (fire-and-forget)
    // Si ya hay mensajes previos, no enviamos email para evitar saturación
    const isFirstMessage = !previousMessages || previousMessages.length <= 1;
    if (isFirstMessage) {
      void notifyAdminSupportMessage({
        userName,
        userEmail: user.email ?? '',
        message: text,
        organizationName,
        sentAt: new Date(),
      });
    }

    // Devolver OK de inmediato — el bot se dispara desde el cliente por separado
    return NextResponse.json({ ok: true, userId: user.id, organizationId: organization_id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Comprobar si el admin (humano) ya respondió en esta conversación.
    // Si hay mensajes reales del admin (is_bot_message=false), preservar la conversación.
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!sbUrl || !serviceKey) {
      return NextResponse.json(
        { error: 'Configuración del servidor incompleta (Supabase service).' },
        { status: 500 },
      );
    }
    const { createClient: createAdmin } = await import('@supabase/supabase-js');
    const adminClient = createAdmin(sbUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: adminReplies } = await adminClient
      .from('support_chat_messages')
      .select('id')
      .eq('user_id', user.id)
      .eq('sender', 'admin')
      .eq('is_bot_message', false)
      .limit(1);

    // Si el admin respondió → no borrar, devolver preserved=true para que el cliente recargue
    if (adminReplies && adminReplies.length > 0) {
      return NextResponse.json({ ok: true, preserved: true });
    }

    // Sin respuesta humana → borrar todo y resetear el bot
    const del = await deleteSupportChatMessagesForUser(user.id);
    if (!del.ok) {
      return NextResponse.json(
        { error: humanizeSupportChatDbError(del.error ?? 'No se pudo borrar el historial') },
        { status: 500 },
      );
    }

    void enableBotForUser(user.id);

    return NextResponse.json({ ok: true, preserved: false });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

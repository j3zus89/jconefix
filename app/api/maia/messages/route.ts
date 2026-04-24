import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET: Obtener mensajes de una conversación
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get('conversationId');

  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId required' }, { status: 400 });
  }

  const { data: messages, error } = await supabase
    .from('whatsapp_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(100);

  if (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messages: messages || [] });
}

// POST: Enviar mensaje manual (intervención humana)
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { conversationId, content } = body;

    if (!conversationId || !content?.trim()) {
      return NextResponse.json({ error: 'conversationId and content required' }, { status: 400 });
    }

    // Obtener información del perfil del usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, full_name')
      .eq('id', user.id)
      .single();

    const senderName = profile?.full_name || profile?.first_name || 'Técnico';

    // Insertar mensaje
    const { data: message, error: msgError } = await supabase
      .from('whatsapp_messages')
      .insert({
        conversation_id: conversationId,
        organization_id: (await supabase
          .from('whatsapp_conversations')
          .select('organization_id')
          .eq('id', conversationId)
          .single()).data?.organization_id,
        message_type: 'text',
        content: content.trim(),
        sender_type: 'human',
        sender_name: senderName,
        sender_id: user.id,
        whatsapp_status: 'pending',
      })
      .select()
      .single();

    if (msgError) {
      throw msgError;
    }

    // Silenciar la IA por 10 minutos
    await supabase.rpc('silence_ai_for_conversation', {
      p_conversation_id: conversationId,
      p_minutes: 10,
      p_reason: 'human_intervention',
    });

    // Registrar la intervención
    await supabase
      .from('whatsapp_human_interventions')
      .insert({
        conversation_id: conversationId,
        organization_id: (await supabase
          .from('whatsapp_conversations')
          .select('organization_id')
          .eq('id', conversationId)
          .single()).data?.organization_id,
        user_id: user.id,
        message_sent: content.trim(),
        ai_paused_duration_minutes: 10,
      });

    return NextResponse.json({ message });
  } catch (error: any) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

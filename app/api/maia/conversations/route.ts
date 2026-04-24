import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  
  // Verificar autenticación
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Obtener conversaciones activas del usuario con mensajes recientes
  const { data: conversations, error } = await supabase
    .from('whatsapp_conversations')
    .select(`
      *,
      whatsapp_messages!whatsapp_messages_conversation_id_fkey (
        id,
        content,
        sender_type,
        sender_name,
        created_at
      )
    `)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ 
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    }, { status: 500 });
  }

  return NextResponse.json({ conversations: conversations || [] });
}

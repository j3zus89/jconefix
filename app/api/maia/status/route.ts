import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Obtener el estado de conexión para la organización del usuario
  const { data: status, error } = await supabase
    .from('whatsapp_connection_status')
    .select('*')
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ 
    status: status || { 
      status: 'disconnected',
      qr_code: null,
      qr_expires_at: null,
    }
  });
}

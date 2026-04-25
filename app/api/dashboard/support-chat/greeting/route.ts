import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const GROQ_API_KEY = process.env.GROQ_API_KEY ?? '';
const GROQ_MODEL = process.env.SUPPORT_BOT_GROQ_MODEL?.trim() || 'llama-3.3-70b-versatile';
const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';

const GREETING_PROMPT = `Sos MARI, del equipo de soporte de JC ONE FIX. Sos una persona real, no un bot.

Generá un saludo inicial NATURAL y HUMANO para abrir una conversación de soporte. Variá el saludo cada vez. No uses siempre la misma estructura.

Ejemplos de tono (no copies exacto, creá uno nuevo):
- "Hola! 👋 Soy Mari. ¿En qué te ayudo hoy?"
- "Dale, che, contame qué necesitás."
- "Buenas! Soy Mari del equipo de JC ONE FIX. ¿Cómo va?"
- "¡Hola! ¿Todo bien? Soy Mari, estoy por acá si necesitás una mano con el panel."

REGLAS:
- Máximo 15-20 palabras.
- Soná como una persona real del equipo de soporte argentino.
- No digas que sos "asistente virtual" ni "IA".
- Usá español rioplatense natural: "che", "dale", "fijate", "mirá".
- Podés usar 1 emoji máximo.
- Variá el saludo. No repitas siempre lo mismo.`;

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!GROQ_API_KEY.trim()) {
      return NextResponse.json({ 
        greeting: "¡Hola! 👋 Soy Mari del equipo de JC ONE FIX. ¿En qué te ayudo hoy?" 
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(GROQ_CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: GREETING_PROMPT },
            { role: 'user', content: 'Generá un saludo natural y variado.' }
          ],
          temperature: 0.85,
          max_tokens: 60,
        }),
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        return NextResponse.json({ 
          greeting: "¡Hola! 👋 Soy Mari. ¿En qué te ayudo hoy?" 
        });
      }

      const json = await res.json();
      const greeting = json?.choices?.[0]?.message?.content?.trim();

      if (!greeting) {
        return NextResponse.json({ 
          greeting: "¡Hola! 👋 Soy Mari del equipo. ¿En qué te ayudo?" 
        });
      }

      return NextResponse.json({ greeting });
    } catch {
      clearTimeout(timeoutId);
      return NextResponse.json({ 
        greeting: "¡Hola! 👋 Soy Mari. ¿En qué te ayudo hoy?" 
      });
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

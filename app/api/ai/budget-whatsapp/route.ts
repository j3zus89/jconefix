import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientFromRequest } from '@/lib/supabase/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';
const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const SYSTEM_PROMPT = `Eres un asesor de servicio tecnico profesional.
Tu tarea es redactar un presupuesto de reparacion para enviar por WhatsApp al cliente.

REGLAS DE ESCRITURA:
- Tono profesional, claro y cercano.
- NO uses emojis ni caracteres especiales de ningun tipo.
- NO uses asteriscos ni formato markdown.
- Estructura el mensaje exactamente asi:
  1. Saludo personalizado con el nombre del cliente.
  2. Resumen de que se va a reparar (dispositivo y problema).
  3. Desglose de repuestos y servicios con sus precios (si los hay).
  4. Total claro.
  5. Clausula de validez segun el pais (ver abajo).
  6. Despedida breve ofreciendo atender dudas.

REGLA DE VALIDEZ:
- Si el pais es ARGENTINA: "Presupuesto valido por 48 horas debido a la volatilidad de precios."
- Si el pais es ESPANA u otro: "Presupuesto valido por 7 dias naturales."

FORMATO:
- Usa saltos de linea reales para separar secciones.
- Incluye el simbolo de moneda correcto en los importes.
- Si no hay desglose de repuestos, omite esa seccion sin inventar precios.
- El mensaje final NO debe superar 300 palabras.`;

type TicketData = {
  ticket_number: string;
  customer_name: string;
  device_brand?: string | null;
  device_model?: string | null;
  device_type: string;
  issue_description: string;
  parts?: Array<{ part_name: string; quantity: number; unit_cost: number; total_cost: number }>;
  estimated_cost?: number | null;
  final_cost?: number | null;
  country?: string | null;
  currency_symbol: string;
};

/** Genera un presupuesto de plantilla sin IA — siempre funciona. */
function generateTemplate(data: TicketData): string {
  const sym = data.currency_symbol || '\u20ac';
  const total = data.final_cost ?? data.estimated_cost ?? 0;
  const device = [data.device_brand, data.device_model, data.device_type]
    .filter(Boolean)
    .join(' ');
  const isAR = data.country === 'AR';
  const validity = isAR
    ? 'Presupuesto valido por 48 horas debido a la volatilidad de precios.'
    : 'Presupuesto valido por 7 dias naturales.';

  const lines: string[] = [];

  lines.push(`Hola ${data.customer_name},`);
  lines.push('');
  lines.push(
    `Te contactamos desde el servicio tecnico para informarte sobre la reparacion de tu ${device || 'dispositivo'}.`
  );
  lines.push('');
  lines.push(`Problema detectado: ${data.issue_description}`);

  if (data.parts && data.parts.length > 0) {
    lines.push('');
    lines.push('Desglose de repuestos y servicios:');
    for (const p of data.parts) {
      lines.push(
        `  - ${p.part_name} (x${p.quantity}): ${sym} ${Number(p.total_cost).toFixed(2)}`
      );
    }
  }

  lines.push('');
  lines.push(`Total estimado: ${sym} ${Number(total).toFixed(2)}`);
  lines.push('');
  lines.push(validity);
  lines.push('');
  lines.push(
    'Quedamos a tu disposicion para cualquier consulta. Gracias por confiar en nosotros.'
  );

  return lines.join('\n');
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Llama a Gemini con un reintento rápido en caso de 429. */
async function callGemini(payload: object): Promise<Response | null> {
  if (!GEMINI_API_KEY) return null;

  const url = `${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`;
  const opts: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20_000),
  };

  try {
    const res = await fetch(url, opts);
    if (res.status === 429) {
      // Un solo reintento tras 3 s
      await sleep(3_000);
      return await fetch(url, { ...opts, signal: AbortSignal.timeout(20_000) });
    }
    return res;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  let body: TicketData;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const {
    ticket_number,
    customer_name,
    device_brand,
    device_model,
    device_type,
    issue_description,
    parts = [],
    estimated_cost,
    final_cost,
    country,
    currency_symbol,
  } = body;

  const sym = currency_symbol || '€';
  const total = final_cost ?? estimated_cost ?? 0;

  const partsLines =
    parts.length > 0
      ? parts
          .map((p) => `  - ${p.part_name} x${p.quantity}: ${sym} ${Number(p.total_cost).toFixed(2)}`)
          .join('\n')
      : null;

  const userMessage = `
Genera el presupuesto WhatsApp para el siguiente ticket de reparación:

TICKET: ${ticket_number}
CLIENTE: ${customer_name}
DISPOSITIVO: ${[device_brand, device_model, device_type].filter(Boolean).join(' ')}
PROBLEMA: ${issue_description}
${partsLines ? `REPUESTOS/SERVICIOS:\n${partsLines}` : '(sin desglose de repuestos)'}
TOTAL: ${sym} ${Number(total).toFixed(2)}
PAÍS DE LA ORGANIZACIÓN: Argentina
SÍMBOLO DE MONEDA: ${sym}
`.trim();

  const payload = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 600 },
  };

  // Intentar con IA
  const gemRes = await callGemini(payload);

  if (gemRes && gemRes.ok) {
    try {
      const data = await gemRes.json();
      const message: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      if (message.trim()) {
        return NextResponse.json({ message: message.trim() });
      }
    } catch {
      // caer al fallback
    }
  }

  // Fallback: plantilla local (siempre funciona)
  const fallback = generateTemplate({
    ticket_number,
    customer_name,
    device_brand,
    device_model,
    device_type,
    issue_description,
    parts,
    estimated_cost,
    final_cost,
    country,
    currency_symbol,
  });

  // Si la IA falló por rate-limit avisamos suavemente, pero el mensaje se entrega igualmente
  const usedFallback = !gemRes || !gemRes.ok;
  return NextResponse.json({
    message: fallback,
    ...(usedFallback && { notice: 'Generado con plantilla (IA ocupada).' }),
  });
}

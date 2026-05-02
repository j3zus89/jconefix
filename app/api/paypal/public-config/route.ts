import { NextResponse } from 'next/server';

/**
 * Client ID público de PayPal resuelto en runtime (misma lógica que `next.config.js` env).
 * Así el SDK no depende del valor incrustado en el build: tras cambiar variables en Vercel
 * basta desplegar la app; no hace falta que el chunk `_next/static` traiga un NEXT_PUBLIC viejo.
 */
export async function GET() {
  const clientId = (
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ||
    process.env.PAYPAL_CLIENT_ID ||
    ''
  ).trim();

  return NextResponse.json(
    { clientId },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}

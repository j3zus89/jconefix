/**
 * Opciones mínimas para cookies seteadas en el servidor (middleware, Route Handlers, Server Actions).
 * Supabase SSR pasa sus propias opciones; aquí fusionamos `secure` en prod y defaults seguros.
 */
export type ServerCookieSetOptions = {
  path?: string;
  maxAge?: number;
  expires?: Date;
  domain?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none' | boolean;
  partitioned?: boolean;
  priority?: 'low' | 'medium' | 'high';
};

export function mergeServerSetCookieOptions(
  options?: ServerCookieSetOptions,
): ServerCookieSetOptions {
  const o = options ?? {};
  const prod = process.env.NODE_ENV === 'production';
  const allowClientRead = o.httpOnly === false;
  return {
    ...o,
    secure: prod,
    httpOnly: allowClientRead ? false : true,
    sameSite: o.sameSite ?? 'lax',
  };
}

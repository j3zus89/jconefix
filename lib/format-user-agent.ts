/** Resumen legible del User-Agent para la tabla de sesiones (sin dependencias). */
export function shortUserAgentLabel(ua: string | null | undefined): string {
  const s = (ua || '').trim();
  if (!s) return 'Navegador desconocido';

  const mobile = /Mobile|Android|iPhone|iPad/i.test(s);
  let engine = 'Navegador';
  if (/Edg\//i.test(s)) engine = 'Edge';
  else if (/OPR\/|Opera/i.test(s)) engine = 'Opera';
  else if (/Firefox\//i.test(s)) engine = 'Firefox';
  else if (/Chrome\//i.test(s) && !/Edg/i.test(s)) engine = 'Chrome';
  else if (/Safari\//i.test(s) && !/Chrome/i.test(s)) engine = 'Safari';

  let os = '';
  if (/Windows NT 10/i.test(s)) os = 'Windows';
  else if (/Windows/i.test(s)) os = 'Windows';
  else if (/Mac OS X|Macintosh/i.test(s)) os = 'macOS';
  else if (/Android/i.test(s)) os = 'Android';
  else if (/iPhone|iPad|iOS/i.test(s)) os = 'iOS';
  else if (/Linux/i.test(s)) os = 'Linux';

  const parts = [engine, os || (mobile ? 'Móvil' : 'Escritorio')].filter(Boolean);
  return parts.join(' · ');
}

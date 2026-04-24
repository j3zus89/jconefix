/**
 * Video del hero (modal play). No subas archivos > ~50–100 MB al deploy de Vercel:
 * usá URL directa .mp4 (Supabase, R2…) o el enlace de la página de Vimeo.
 */
export function getHeroVideoPublicUrl(): string {
  const u = process.env.NEXT_PUBLIC_HERO_VIDEO_URL?.trim();
  if (u) return u;
  return '/jconefix.mp4';
}

/** ID numérico desde `https://vimeo.com/123` o `https://player.vimeo.com/video/123`. */
export function parseVimeoVideoId(url: string): string | null {
  const t = url.trim();
  const m =
    t.match(/vimeo\.com\/(?:video\/)?(\d+)/i) ?? t.match(/player\.vimeo\.com\/video\/(\d+)/i);
  return m?.[1] ?? null;
}

/** URL del iframe oficial de Vimeo (autoplay tras clic en el modal). */
export function vimeoPlayerEmbedUrl(videoId: string): string {
  const q = new URLSearchParams({
    autoplay: '1',
    title: '0',
    byline: '0',
    portrait: '0',
  });
  return `https://player.vimeo.com/video/${videoId}?${q}`;
}

/** RGBA a partir de hex (#RRGGBB) para fondos de burbuja. */
export function hexToRgba(hexColor: string, alpha: number): string {
  const raw = (hexColor || '#0d9488').trim();
  const hex = raw.startsWith('#') ? raw.slice(1) : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return `rgba(13, 148, 136, ${alpha})`;
  }
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Fondo tipo DM (degradado suave con el color del usuario). */
export function outgoingDmBubbleStyle(hexColor: string): { background: string; border: string } {
  const c = hexColor || '#0d9488';
  return {
    background: `linear-gradient(165deg, ${hexToRgba(c, 0.4)} 0%, ${hexToRgba(c, 0.14)} 100%)`,
    border: '1px solid rgba(0,0,0,0.07)',
  };
}

/**
 * Degradado para la pastilla del remitente en el chat (color único por usuario).
 */
export function senderNameGradient(hexColor: string): string {
  const raw = (hexColor || '#0d9488').trim();
  const hex = raw.startsWith('#') ? raw.slice(1) : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return 'linear-gradient(135deg, #0d9488, #115e59)';
  }
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const r2 = Math.max(0, Math.min(255, Math.round(r * 0.55 + 50)));
  const g2 = Math.max(0, Math.min(255, Math.round(g * 0.55 + 40)));
  const b2 = Math.max(0, Math.min(255, Math.round(b * 0.6 + 45)));
  return `linear-gradient(135deg, rgb(${r},${g},${b}), rgb(${r2},${g2},${b2}))`;
}

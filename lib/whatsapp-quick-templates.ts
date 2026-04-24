export type WhatsappQuickTemplate = { id: string; label: string; text: string };

/** Datos del equipo en taller (ticket / boleto). */
export type WhatsappDeviceContext = {
  deviceCategory?: string | null;
  /** Campo "Dispositivo" del formulario (ej. samsung s24) */
  deviceType?: string | null;
  deviceBrand?: string | null;
  deviceModel?: string | null;
};

/** Saludo con primer nombre si existe (p. ej. "Hola María," o "Hola,"). */
export function whatsappGreetingPrefix(displayName: string | null | undefined): string {
  const t = displayName?.trim();
  if (!t) return 'Hola,';
  const first = t.split(/\s+/)[0];
  return `Hola ${first},`;
}

const CATEGORY_TO_LABEL: Record<string, string> = {
  SMARTPHONE: 'smartphone',
  SMARTPHONES: 'smartphone',
  TABLET: 'tablet',
  TABLETS: 'tablet',
  LAPTOP: 'portátil o PC',
  LAPTOPS: 'portátil o PC',
  CONSOLA: 'consola',
  CONSOLAS: 'consola',
  SMARTWATCH: 'smartwatch',
  AURICULAR: 'auriculares',
  AURICULARES: 'auriculares',
  SMART_TV: 'smart TV',
  AUDIO_VIDEO: 'equipo de audio y vídeo',
  OTROS: 'equipo',
  OTHER: 'equipo',
};

function categoryLabel(raw: string | null | undefined): string | null {
  if (raw == null || raw === '') return null;
  const key = String(raw).trim().toUpperCase();
  return CATEGORY_TO_LABEL[key] ?? null;
}

/**
 * Frase tipo "tu Samsung S24", "tu smartphone", "tu dispositivo" según categoría y datos del ticket.
 */
export function whatsappTuDispositivoPhrase(ctx: WhatsappDeviceContext | undefined): string {
  const dt = ctx?.deviceType?.trim();
  if (dt) {
    return `tu ${dt}`;
  }

  const brand = ctx?.deviceBrand?.trim();
  const model = ctx?.deviceModel?.trim();
  const composed = [brand, model].filter(Boolean).join(' ').trim();
  if (composed) {
    return `tu ${composed}`;
  }

  const fromCat = categoryLabel(ctx?.deviceCategory ?? null);
  if (fromCat) {
    return `tu ${fromCat}`;
  }

  return 'tu dispositivo';
}

/** Una línea para el modal (equipo al que aplica el mensaje). */
export function whatsappDeviceSummaryLine(ctx: WhatsappDeviceContext | undefined): string | null {
  if (!ctx) return null;
  const parts: string[] = [];
  const cat = ctx.deviceCategory?.trim();
  if (cat) parts.push(cat);
  const dt = ctx.deviceType?.trim();
  if (dt) parts.push(dt);
  else {
    const b = ctx.deviceBrand?.trim();
    const m = ctx.deviceModel?.trim();
    if (b || m) parts.push([b, m].filter(Boolean).join(' '));
  }
  if (parts.length === 0) return null;
  return parts.join(' · ');
}

/** Plantillas rápidas gratuitas (wa.me) — marca JC ONE FIX, texto acorde al equipo. */
export function buildWhatsappQuickTemplates(
  customerDisplayName: string | null | undefined,
  deviceContext?: WhatsappDeviceContext | null
): WhatsappQuickTemplate[] {
  const g = whatsappGreetingPrefix(customerDisplayName);
  const ref = whatsappTuDispositivoPhrase(deviceContext ?? undefined);

  return [
    {
      id: 'bienvenida',
      label: 'Bienvenida',
      text: `${g} gracias por confiar en JC ONE FIX. Hemos registrado ${ref} para su reparación.`,
    },
    {
      id: 'presupuesto',
      label: 'Presupuesto',
      text: `${g} ya tenemos el presupuesto de la reparación de ${ref} listo. ¿Deseas que procedamos?`,
    },
    {
      id: 'listo',
      label: 'Listo',
      text: `${g} te informamos que ${ref} ya está listo para recoger en JC ONE FIX.`,
    },
  ];
}

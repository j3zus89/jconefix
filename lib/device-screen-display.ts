/**
 * Pulgadas de Smart TV: el taller/cliente escribe lo que quiera (55, 55", 55 pulgadas…).
 * Solo normalizamos espacios para mostrar.
 */

export function formatTvScreenInchesForUi(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  return t;
}

/**
 * Línea compacta: MARCA · pulgadas · MODELO (solo pulgadas si categoría SMART_TV y hay valor).
 */
export function formatEquipoBrandInchesModelLine(args: {
  category: string | null | undefined;
  brand: string | null | undefined;
  model: string | null | undefined;
  screenInches: string | null | undefined;
}): string {
  const brand = args.brand?.trim();
  const model = args.model?.trim();
  const inches =
    args.category === 'SMART_TV' ? formatTvScreenInchesForUi(args.screenInches) : null;
  const parts: string[] = [];
  if (brand) parts.push(brand);
  if (inches) parts.push(inches);
  if (model) parts.push(model);
  return parts.join(' · ');
}

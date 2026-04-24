/**
 * Lista pública en pesos argentinos (ARS): única fuente para landing, /precios, checkout, SEO y JSON-LD.
 * Actualizá los números acá cuando cambien las tarifas; el resto del código lee vía `JC_PLAN_AR` en `plan-marketing.ts`.
 *
 * Plan anual: pago único por el período; quien ya pagó no debe recibir aumentos retroactivos en ese período.
 * Plan mensual: podés subir la lista cuando la inflación o tus costos lo exijan; comunicá el cambio con
 * antelación (web + panel / email) y actualizá preferencias de Mercado Pago para el nuevo monto.
 * No hace falta nombrar moneda extranjera al cliente: el discurso público es “pesos, infraestructura y aviso previo”.
 */
export const PRICING_AR = {
  PRECIO_MENSUAL: 30_000,
  PRECIO_ANUAL: 300_000,
} as const;

/** Alias con nombre explícito para imports puntuales. */
export const PRECIO_MENSUAL_ARS = PRICING_AR.PRECIO_MENSUAL;
export const PRECIO_ANUAL_ARS = PRICING_AR.PRECIO_ANUAL;

export function formatPrecioListadoArs(amount: number): string {
  return `$${amount.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
}

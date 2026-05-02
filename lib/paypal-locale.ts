/**
 * PayPal Orders v2 rechaza `es-419` (UN M.49) en `application_context.locale`.
 * Para la API REST no enviamos `application_context.locale`; en el SDK visual
 * forzamos `es_ES` para que el navegador no derive `es-419`.
 */
export const PAYPAL_SDK_SCRIPT_LOCALE = 'es_ES';

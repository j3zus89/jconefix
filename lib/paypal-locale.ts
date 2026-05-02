/**
 * PayPal Orders v2 rechaza `es-419` (UN M.49) en `application_context.locale`.
 * En el SDK del navegador forzamos `es_ES` para que no derive `es-419`.
 * En la API REST debemos enviar un locale explícito permitido; si no, PayPal
 * puede inferir `es-419` y la orden falla con INVALID_PARAMETER_SYNTAX.
 */
export const PAYPAL_SDK_SCRIPT_LOCALE = 'es_ES';

/** `application_context.locale` en POST /v2/checkout/orders (BCP-47, no es-419). */
export const PAYPAL_ORDERS_V2_LOCALE = 'es-ES';

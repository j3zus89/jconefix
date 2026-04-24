/**
 * `Request#formData()` devuelve la FormData WHATWG; TypeScript mezcla ese valor con el tipo
 * homónimo de Node (sin `.get()`), lo que rompe `next build`. Centralizamos el casteo aquí.
 */
export async function getWebFormData(request: Request): Promise<globalThis.FormData> {
  return (await request.formData()) as unknown as globalThis.FormData;
}

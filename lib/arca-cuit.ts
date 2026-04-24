/** Solo dígitos; CUIT argentino tiene 11. */
export function parseCuitNumber(registrationNumber: string | null | undefined): number | null {
  const d = String(registrationNumber || '').replace(/\D/g, '');
  if (d.length !== 11) return null;
  return parseInt(d, 10);
}

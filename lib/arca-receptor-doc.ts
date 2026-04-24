import { parseCuitNumber } from '@/lib/arca-cuit';

/** AFIP DocTipo receptor: 80 CUIT, 96 DNI, 99 consumidor final. */
export function parseAfipReceptorDoc(taxId: string | null | undefined): { DocTipo: number; DocNro: number } {
  const raw = String(taxId || '').replace(/\D/g, '');
  if (!raw) {
    return { DocTipo: 99, DocNro: 0 };
  }
  const cuit = parseCuitNumber(taxId);
  if (cuit != null) {
    return { DocTipo: 80, DocNro: cuit };
  }
  if (raw.length >= 7 && raw.length <= 8) {
    return { DocTipo: 96, DocNro: parseInt(raw, 10) };
  }
  if (raw.length === 11) {
    return { DocTipo: 80, DocNro: parseInt(raw, 10) };
  }
  return { DocTipo: 99, DocNro: 0 };
}

/**
 * Validaciones previas a crear facturas (checklist legal y coherencia numérica).
 */

import { IVA_CONDITIONS_AR } from '@/lib/locale';

export type InvoiceDraftLine = {
  description: string;
  quantity: number;
  unitPrice: number;
  /** Si existe, se puede comprobar stock en `products`. */
  productId?: string | null;
};

const EPS = 0.02;

/** DNI/NIF/CUIT/CIF: mínimo razonable; dirección fiscal. */
export function validateBillingIdentity(taxId: string, address: string): string[] {
  const errors: string[] = [];
  const t = taxId.trim();
  const a = address.trim();
  if (t.length < 5) {
    errors.push('Falta documento fiscal del cliente (DNI / NIF / CIF / CUIT, mín. 5 caracteres).');
  }
  if (a.length < 8) {
    errors.push('Falta dirección fiscal del cliente (mín. 8 caracteres).');
  }
  return errors;
}

/** Receptor Argentina: condición IVA AFIP/ARCA obligatoria para comprobantes válidos. */
export function validateArgentinaIvaCondition(taxClass: string | null | undefined): string[] {
  const v = (taxClass || '').trim();
  if (!v) {
    return [
      'Argentina: indicá la condición frente al IVA del cliente (Monotributo, Responsable Inscripto, Exento, etc.) en el ticket o en la ficha del cliente.',
    ];
  }
  if (!(IVA_CONDITIONS_AR as readonly string[]).includes(v)) {
    return ['Argentina: la condición frente al IVA del cliente no está en la lista permitida.'];
  }
  return [];
}

export function validateDraftLines(lines: InvoiceDraftLine[]): { errors: string[]; linesSubtotal: number } {
  const errors: string[] = [];
  let linesSubtotal = 0;
  if (!lines.length) {
    errors.push('Añade al menos una línea de concepto.');
    return { errors, linesSubtotal: 0 };
  }
  lines.forEach((L, i) => {
    const n = i + 1;
    const label = lines.length > 1 ? `Línea ${n}` : 'La línea';
    const desc = (L.description || '').trim();
    if (!desc) errors.push(`${label}: falta descripción.`);
    if (!Number.isFinite(L.quantity) || L.quantity <= 0) {
      errors.push(`${label}: la cantidad debe ser mayor que 0.`);
    }
    if (!Number.isFinite(L.unitPrice) || L.unitPrice <= 0) {
      errors.push(`${label}: el precio unitario debe ser mayor que 0.`);
    }
    if (Number.isFinite(L.quantity) && Number.isFinite(L.unitPrice) && L.quantity > 0 && L.unitPrice > 0) {
      linesSubtotal += L.quantity * L.unitPrice;
    }
  });
  return { errors, linesSubtotal };
}

/** Coherencia de descuento e importes respecto al subtotal de líneas. */
export function validateInvoiceAmounts(linesSubtotal: number, discount: number, taxAmount: number): string[] {
  const errors: string[] = [];
  const d = Math.max(0, discount);
  const tax = Math.max(0, taxAmount);
  if (!Number.isFinite(linesSubtotal) || linesSubtotal <= 0) {
    errors.push('El subtotal de las líneas debe ser mayor que 0.');
  }
  if (linesSubtotal < d - EPS) {
    errors.push('El descuento no puede superar el subtotal de las líneas.');
  }
  const total = linesSubtotal - d + tax;
  if (!Number.isFinite(total) || total < -EPS) {
    errors.push('El total de la factura (subtotal − descuento + impuestos) no es válido.');
  }
  return errors;
}

/** Stock en `products` para líneas con `productId` (UUID). */
export async function validateLinesProductStock(
  supabase: any,
  lines: InvoiceDraftLine[]
): Promise<string[]> {
  const errors: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i];
    const pid = L.productId?.trim();
    if (!pid) continue;
    const { data, error } = await supabase
      .from('products')
      .select('name, quantity')
      .eq('id', pid)
      .maybeSingle();
    if (error || !data) {
      errors.push(`Línea ${i + 1}: no se encontró el producto en inventario (ID no válido).`);
      continue;
    }
    const avail = Number(data.quantity ?? 0);
    if (avail < L.quantity) {
      errors.push(
        `Línea ${i + 1} («${data.name ?? 'Producto'}»): stock insuficiente (${avail} disponibles, ${L.quantity} en la factura).`
      );
    }
  }
  return errors;
}

export type TicketPartLike = {
  part_name?: string;
  quantity: number;
  product_id?: string | null;
  products?: { name: string; quantity: number } | null;
};

/** Stock de repuestos del ticket de taller vinculados a `products`. */
export function validateTicketPartsStock(parts: TicketPartLike[]): string[] {
  const errors: string[] = [];
  for (const p of parts) {
    if (!p.product_id || !p.products) continue;
    const avail = Number(p.products.quantity ?? 0);
    const need = Number(p.quantity ?? 0);
    if (need > avail) {
      const name = p.part_name || p.products.name || 'Repuesto';
      errors.push(`Stock insuficiente para «${name}»: hay ${avail} en inventario y el ticket requiere ${need}.`);
    }
  }
  return errors;
}

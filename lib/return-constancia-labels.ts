/** Escenarios y liquidaciones para devoluciones (talleres heterogéneos). */

export const RETURN_SCENARIOS = [
  { value: 'refund_money', label: 'Reembolso de dinero' },
  { value: 'return_goods', label: 'Devolución de equipo o piezas (sin dinero)' },
  { value: 'mixed', label: 'Mixto (equipo + dinero o descuento)' },
  { value: 'store_credit', label: 'Abono / crédito en tienda' },
  { value: 'warranty_labor', label: 'Garantía de mano de obra' },
  { value: 'warranty_parts', label: 'Garantía de repuesto' },
  { value: 'order_cancel', label: 'Anulación de pedido / servicio' },
  { value: 'service_adjustment', label: 'Ajuste de servicio (descuento, error de presupuesto)' },
  { value: 'other', label: 'Otro (describir abajo)' },
] as const;

export const RETURN_SETTLEMENTS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'transfer', label: 'Transferencia bancaria' },
  { value: 'card_refund', label: 'Reembolso a tarjeta' },
  { value: 'none_goods_only', label: 'Sin movimiento de caja (solo entrega física)' },
  { value: 'exchange', label: 'Cambio por otro artículo / equipo' },
  { value: 'store_voucher', label: 'Vale o saldo en cuenta' },
  { value: 'pending', label: 'Pendiente de ejecutar' },
  { value: 'other', label: 'Otra forma' },
] as const;

export type ReturnScenarioValue = (typeof RETURN_SCENARIOS)[number]['value'];
export type ReturnSettlementValue = (typeof RETURN_SETTLEMENTS)[number]['value'];

export function labelReturnScenario(v: string | null | undefined): string {
  const x = RETURN_SCENARIOS.find((s) => s.value === v);
  return x?.label || v || '—';
}

export function labelReturnSettlement(v: string | null | undefined): string {
  const x = RETURN_SETTLEMENTS.find((s) => s.value === v);
  return x?.label || v || '—';
}

export function labelReturnStatus(v: string | null | undefined): string {
  const m: Record<string, string> = {
    registered: 'Registrada',
    delivered: 'Entregada / liquidada',
    void: 'Anulada',
  };
  return m[v || ''] || v || '—';
}

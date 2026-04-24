'use client';

/**
 * Botón "Generar Presupuesto WhatsApp"
 * ─────────────────────────────────────
 * 1. Lee los datos del ticket: cliente, dispositivo, repuestos/servicios, total.
 * 2. Llama a /api/ai/budget-whatsapp (Route Handler) que usa Gemini para redactar.
 * 3. Abre la URL de WhatsApp Web con el texto listo para enviar.
 */

import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export type BudgetTicketPart = {
  part_name: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
};

export type BudgetTicketData = {
  ticket_number: string;
  customer_name: string;
  customer_phone: string | null;
  device_brand: string | null;
  device_model: string | null;
  device_type: string;
  issue_description: string;
  parts: BudgetTicketPart[];
  estimated_cost: number | null;
  final_cost: number | null;
  /** 'ES' | 'AR' | null */
  country: string | null;
  currency_symbol: string;
};

type Props = {
  ticket: BudgetTicketData;
  /** Clase CSS extra para el botón */
  className?: string;
  /** Tamaño del botón: 'sm' | 'md' */
  size?: 'sm' | 'md';
};

export function WhatsAppBudgetButton({ ticket, className, size = 'md' }: Props) {
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!ticket.customer_phone?.trim()) {
      toast.error('El cliente no tiene teléfono. Añádelo en la ficha antes de generar el presupuesto.');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('✨ Generando presupuesto con IA…');

    try {
      const res = await fetch('/api/ai/budget-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticket),
        signal: AbortSignal.timeout(30_000),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Error ${res.status}`);
      }

      const { message } = await res.json();
      if (!message) throw new Error('La IA no devolvió ningún mensaje.');

      // Limpia el número de teléfono → sólo dígitos y '+'
      const rawPhone = ticket.customer_phone.replace(/[\s\-().]/g, '');
      const phone = rawPhone.startsWith('+') ? rawPhone : rawPhone;

      // Codifica el mensaje respetando saltos de línea como %0A
      const encodedMsg = encodeURIComponent(message);
      const waUrl = `https://wa.me/${phone}?text=${encodedMsg}`;

      toast.success('¡Presupuesto generado! Abriendo WhatsApp…', { id: toastId });
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`No se pudo generar el presupuesto: ${msg}`, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const isSm = size === 'sm';

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => void generate()}
      title="Generar presupuesto con IA y enviarlo por WhatsApp"
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded transition-colors disabled:opacity-60',
        'bg-[#25D366] hover:bg-[#1dbd58] text-white',
        isSm ? 'px-2.5 py-1 text-xs' : 'px-4 py-1.5 text-sm',
        className
      )}
    >
      {loading ? (
        <Loader2 className={cn('animate-spin shrink-0', isSm ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
      ) : (
        <Sparkles className={cn('shrink-0', isSm ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
      )}
      {loading ? 'Generando…' : 'Presupuesto IA'}
    </button>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { waMeUrlForPhone } from '@/lib/wa-me';
import {
  buildWhatsappQuickTemplates,
  whatsappDeviceSummaryLine,
} from '@/lib/whatsapp-quick-templates';
import { toast } from 'sonner';
import { WhatsAppLogo } from '@/components/whatsapp/WhatsAppLogo';

export type WhatsAppQuickSendModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string;
  phone: string | null | undefined;
  /** Texto inicial al abrir (p. ej. contexto de ticket); las plantillas lo sustituyen al pulsarlas. */
  defaultMessage?: string;
  /** Datos del boleto para personalizar el texto (categoría SMARTPHONES, dispositivo, marca…). */
  deviceCategory?: string | null;
  deviceType?: string | null;
  deviceBrand?: string | null;
  deviceModel?: string | null;
  /** Tras abrir wa.me al enviar (p. ej. registrar «último aviso» en el panel Presupuestos). */
  onAfterOpenWa?: () => void;
};

export function WhatsAppQuickSendModal({
  open,
  onOpenChange,
  customerName,
  phone,
  defaultMessage = '',
  deviceCategory,
  deviceType,
  deviceBrand,
  deviceModel,
  onAfterOpenWa,
}: WhatsAppQuickSendModalProps) {
  const [message, setMessage] = useState('');
  const [improving, setImproving] = useState(false);
  const [originalForUndo, setOriginalForUndo] = useState('');
  const [lastImproved, setLastImproved] = useState<string | null>(null);
  const templates = useMemo(
    () =>
      buildWhatsappQuickTemplates(customerName, {
        deviceCategory,
        deviceType,
        deviceBrand,
        deviceModel,
      }),
    [customerName, deviceCategory, deviceType, deviceBrand, deviceModel]
  );
  const deviceLine = useMemo(
    () =>
      whatsappDeviceSummaryLine({
        deviceCategory,
        deviceType,
        deviceBrand,
        deviceModel,
      }),
    [deviceCategory, deviceType, deviceBrand, deviceModel]
  );

  useEffect(() => {
    if (open) {
      setMessage(defaultMessage?.trim() ? defaultMessage : '');
      setOriginalForUndo('');
      setLastImproved(null);
      setImproving(false);
    }
  }, [open, defaultMessage]);

  const clearWaUndo = () => {
    setOriginalForUndo('');
    setLastImproved(null);
  };

  const handlePolishWithAi = async () => {
    const raw = message.trim();
    if (!raw) {
      toast.error('Escribe o elige una plantilla antes de pulir con IA.');
      return;
    }
    setOriginalForUndo(raw);
    setLastImproved(null);
    setImproving(true);
    try {
      const res = await fetch('/api/improve-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text: raw, style: 'whatsapp' }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; text?: string };
      if (!res.ok) {
        clearWaUndo();
        toast.error(typeof data.error === 'string' ? data.error : 'No se pudo pulir el mensaje.');
        return;
      }
      const improved = typeof data.text === 'string' ? data.text.trim() : '';
      if (!improved) {
        clearWaUndo();
        toast.error('La IA devolvió un texto vacío.');
        return;
      }
      if (improved === raw) {
        clearWaUndo();
        toast.success('La IA no propuso cambios.');
        return;
      }
      setLastImproved(improved);
      setMessage(improved);
      toast.success('Mensaje pulido ✨');
    } catch {
      clearWaUndo();
      toast.error('Error de red al contactar la IA.');
    } finally {
      setImproving(false);
    }
  };

  const handleUndoWa = () => {
    if (!originalForUndo) return;
    setMessage(originalForUndo);
    clearWaUndo();
  };

  const handleMessageChange = (next: string) => {
    if (originalForUndo !== '' && lastImproved !== null && next !== lastImproved) {
      clearWaUndo();
    }
    setMessage(next);
  };

  const showWaUndo = originalForUndo !== '' && lastImproved !== null && !improving;

  const handleSend = () => {
    const body = message.trim();
    const url = waMeUrlForPhone(phone, body || undefined);
    if (!url) {
      toast.error('Este cliente no tiene un teléfono válido para WhatsApp (incluye prefijo de país).');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    onAfterOpenWa?.();
    onOpenChange(false);
  };

  const displayName = customerName?.trim() || 'cliente';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg gap-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0d9488]/15 text-[#0d9488]"
              aria-hidden
            >
              <WhatsAppLogo className="h-5 w-5" />
            </span>
            Enviar mensaje a {displayName}
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-gray-500 -mt-1">
          El mensaje se abre en una pestaña nueva (WhatsApp Web o app). Tu sesión en el panel no se cierra.
        </p>

        {deviceLine ? (
          <p className="text-xs text-emerald-900/90 rounded-md border border-emerald-100 bg-emerald-50/80 px-2.5 py-1.5">
            <span className="font-medium text-gray-700">Equipo: </span>
            {deviceLine}
          </p>
        ) : null}

        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">Plantillas rápidas</p>
          <div className="flex flex-wrap gap-2">
            {templates.map((t) => (
              <Button
                key={t.id}
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-8 border-emerald-200/80 hover:bg-emerald-50"
                disabled={improving}
                onClick={() => {
                  clearWaUndo();
                  setMessage(t.text);
                }}
              >
                {t.label}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="wa-quick-message" className="text-xs font-medium text-gray-700 block">
              Mensaje
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 text-xs shrink-0"
                disabled={improving}
                onClick={() => void handlePolishWithAi()}
              >
                {improving ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin shrink-0" aria-hidden />
                ) : (
                  <Sparkles className="mr-1.5 h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden />
                )}
                Pulir con IA
              </Button>
              {showWaUndo ? (
                <button
                  type="button"
                  onClick={handleUndoWa}
                  disabled={improving}
                  className="shrink-0 rounded-md border border-transparent px-2 py-1 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                >
                  ↩️ Deshacer
                </button>
              ) : null}
            </div>
          </div>
          <Textarea
            id="wa-quick-message"
            value={message}
            onChange={(e) => handleMessageChange(e.target.value)}
            rows={5}
            className="resize-none text-sm"
            placeholder="Elige una plantilla o escribe tu mensaje…"
            disabled={improving}
            aria-busy={improving}
          />
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="gap-2 bg-[#0d9488] hover:bg-[#1d4ed8] text-white"
            onClick={handleSend}
            disabled={improving}
          >
            <WhatsAppLogo className="h-4 w-4 shrink-0" />
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

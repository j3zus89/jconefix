'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const DEFAULT_LABEL = 'Diagnóstico / Comentarios de Reparación';

export type DiagnosticNotesWithAiProps = {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  /** Si no se pasa, se usa el título estándar del módulo. */
  label?: React.ReactNode;
  placeholder?: string;
  rows?: number;
  textareaClassName?: string;
  labelClassName?: string;
};

/**
 * Textarea de notas de diagnóstico con «Mejorar con IA» (/api/improve-diagnosis, Groq) y deshacer tras aplicar.
 */
export function DiagnosticNotesWithAi({
  value,
  onChange,
  disabled = false,
  label = DEFAULT_LABEL,
  placeholder,
  rows = 2,
  textareaClassName,
  labelClassName,
}: DiagnosticNotesWithAiProps) {
  const [improving, setImproving] = useState(false);
  /** Texto del técnico justo antes de llamar a la IA (para deshacer). Se fija antes del fetch. */
  const [originalText, setOriginalText] = useState('');
  /** Último texto aplicado tras una mejora exitosa; en estado para que el botón Deshacer no dependa del prop `value` en el mismo ciclo. */
  const [lastImprovedText, setLastImprovedText] = useState<string | null>(null);

  const clearUndoState = () => {
    setOriginalText('');
    setLastImprovedText(null);
  };

  const handleImprove = async () => {
    const raw = value ?? '';
    if (!raw.trim()) {
      toast.error('Escribe notas para poder mejorarlas con IA.');
      return;
    }
    setOriginalText(raw);
    setLastImprovedText(null);
    setImproving(true);
    try {
      const res = await fetch('/api/improve-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text: raw }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; text?: string };
      if (!res.ok) {
        clearUndoState();
        toast.error(typeof data.error === 'string' ? data.error : 'No se pudo mejorar el texto.');
        return;
      }
      const improved = typeof data.text === 'string' ? data.text.trim() : '';
      if (!improved) {
        clearUndoState();
        toast.error('La IA devolvió un texto vacío.');
        return;
      }
      if (improved === raw) {
        clearUndoState();
        toast.success('La IA no propuso cambios.');
        return;
      }
      setLastImprovedText(improved);
      onChange(improved);
    } catch {
      clearUndoState();
      toast.error('Error de red al contactar la IA.');
    } finally {
      setImproving(false);
    }
  };

  const handleUndo = () => {
    if (!originalText) return;
    onChange(originalText);
    clearUndoState();
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    if (originalText !== '' && lastImprovedText !== null && next !== lastImprovedText) {
      clearUndoState();
    }
    onChange(next);
  };

  const showUndo =
    originalText !== '' && lastImprovedText !== null && !improving;

  return (
    <div className="col-span-2">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <Label className={cn('text-xs font-medium text-gray-600', labelClassName)}>{label}</Label>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void handleImprove()}
            disabled={disabled || improving}
            className="shrink-0"
          >
            {improving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin shrink-0" aria-hidden /> : null}
            Mejorar con IA
          </Button>
          {showUndo ? (
            <button
              type="button"
              onClick={handleUndo}
              disabled={disabled || improving}
              className={cn(
                'shrink-0 rounded-md border border-transparent px-2 py-1 text-xs text-muted-foreground',
                'hover:bg-muted/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-50'
              )}
            >
              ↩️ Deshacer
            </button>
          ) : null}
        </div>
      </div>
      <Textarea
        className={cn('mt-1 min-h-[3.25rem] resize-y text-sm', textareaClassName)}
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={handleTextareaChange}
        disabled={disabled || improving}
        aria-busy={improving}
      />
    </div>
  );
}

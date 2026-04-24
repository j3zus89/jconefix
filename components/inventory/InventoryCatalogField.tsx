'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

function normalizeSearch(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

export type InventoryCatalogFieldProps = {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  /** Lista completa de sugerencias (se filtra al escribir). */
  suggestions: string[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Máximo de filas en el desplegable (rendimiento). */
  maxSuggestions?: number;
  /** Si true, con campo vacío no se abre lista (solo al escribir). */
  requireQuery?: boolean;
};

/**
 * Campo texto + desplegable filtrado: al escribir varias letras se acota la lista (acentos ignorados).
 */
export function InventoryCatalogField({
  id,
  value,
  onChange,
  suggestions,
  placeholder,
  className,
  disabled,
  maxSuggestions = 160,
  requireQuery = true,
}: InventoryCatalogFieldProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = value.trim();
    if (requireQuery && q.length < 1) return [];
    const nq = normalizeSearch(q);
    if (!nq) {
      return suggestions.slice(0, maxSuggestions);
    }
    return suggestions.filter((s) => normalizeSearch(s).includes(nq)).slice(0, maxSuggestions);
  }, [value, suggestions, maxSuggestions, requireQuery]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const showList = open && filtered.length > 0 && !disabled;

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      <Input
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
      />
      {showList ? (
        <ul
          className="absolute z-[100] mt-1 max-h-52 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 text-sm shadow-lg"
          role="listbox"
        >
          {filtered.map((s) => (
            <li key={s}>
              <button
                type="button"
                className="w-full px-2 py-1.5 text-left hover:bg-emerald-50 focus:bg-emerald-50 focus:outline-none"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(s);
                  setOpen(false);
                }}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {open && !disabled && requireQuery && value.trim().length < 1 && suggestions.length > 0 ? (
        <p className="mt-1 text-[11px] text-gray-500">Escribe para buscar entre {suggestions.length} opciones…</p>
      ) : null}
    </div>
  );
}
